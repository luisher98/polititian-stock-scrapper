/**
 * @fileoverview Transaction data fetching and processing utilities.
 * Handles fetching and parsing transaction data from the House disclosure website.
 * @module utils/transaction
 */

import { JSDOM } from "jsdom";

/**
 * @typedef {Object} Transaction
 * @property {string} id - Numeric ID from the PDF filename
 * @property {string} name - Politician's full name
 * @property {string} office - Office/district information
 * @property {string} filingYear - Year of the filing
 * @property {string} pdfUrl - Full URL to the transaction PDF
 */

/**
 * Retrieves the most recent transaction for a given year.
 * 
 * @async
 * @param {number} year - The year to fetch transactions for
 * @returns {Promise<Transaction|undefined>} The most recent transaction, if any
 */
export async function getLatestTransaction(year) {
  const transactions = await getTransactions(year);
  return transactions[0];
}

/**
 * Fetches and parses all transactions for a given year.
 * Filters for PTR (Periodic Transaction Report) filings only.
 * 
 * @async
 * @param {number} year - The year to fetch transactions for
 * @returns {Promise<Transaction[]>} Array of parsed transactions
 */
export async function getTransactions(year) {
  const htmlData = await fetchPolititianTransactions(year);

  if (!htmlData) {
    console.error("Failed to fetch HTML data");
    return [];
  }

  try {
    const dom = new JSDOM(htmlData);
    const document = dom.window.document;
    const rows = document.querySelectorAll("tbody tr");

    const results = [];

    rows.forEach((row) => {
      const nameElement = row.querySelector('td[data-label="Name"] a');
      const officeElement = row.querySelector('td[data-label="Office"]');
      const filingYearElement = row.querySelector('td[data-label="Filing Year"]');
      const filingTypeElement = row.querySelector('td[data-label="Filing"]');
      
      // Skip if not a PTR filing
      if (!filingTypeElement || !filingTypeElement.textContent.includes("PTR")) {
        return;
      }

      // Skip if any required element is missing
      if (!nameElement || !officeElement || !filingYearElement) {
        return;
      }

      const href = nameElement.getAttribute("href");
      // Skip if no href or not a PDF
      if (!href || !href.includes("ptr-pdfs")) {
        return;
      }

      // Extract numeric ID from href
      const matches = href.match(/\/(\d+)\.pdf$/);
      if (!matches) {
        console.log("Could not extract numeric ID from href:", href);
        return;
      }
      const id = matches[1]; // Get the full ID from the PDF filename

      const name = nameElement.textContent.trim();
      const office = officeElement.textContent.trim();
      const filingYear = filingYearElement.textContent.trim();
      
      // Ensure the URL starts with a forward slash
      const cleanHref = href.startsWith("/") ? href : "/" + href;
      const pdfUrl = new URL(cleanHref, "https://disclosures-clerk.house.gov").toString();

      results.push({
        id,
        name,
        office,
        filingYear,
        pdfUrl,
      });
    });

    sortByIdDescending(results);
    return results;
  } catch (error) {
    console.error("Error parsing HTML data:", error);
    return [];
  }
}

/**
 * Fetches raw HTML data from the House disclosure website.
 * 
 * @async
 * @param {number} year - The year to fetch transactions for
 * @throws {Error} If the HTTP request fails
 * @returns {Promise<string>} Raw HTML response text
 */
async function fetchPolititianTransactions(year) {
  const requestOptions = {
    method: "POST",
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `https://disclosures-clerk.house.gov/FinancialDisclosure/ViewMemberSearchResult?filingYear=${year}`,
      requestOptions
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.text();
    return result;
  } catch (error) {
    console.error("Failed to fetch politician transactions:", error);
    throw error; // Propagate the error up
  }
}

/**
 * Sorts an array of transactions by their numeric ID in descending order.
 * Most recent transactions (higher IDs) appear first.
 * 
 * @param {Transaction[]} obj - Array of transactions to sort
 * @returns {Transaction[]} The sorted array (modified in place)
 */
function sortByIdDescending(obj) {
  return obj.sort((a, b) => {
    // Convert IDs to numbers for proper numeric comparison
    const idA = parseInt(a.id, 10);
    const idB = parseInt(b.id, 10);
    
    // Handle invalid numbers
    if (isNaN(idA) && isNaN(idB)) return 0;
    if (isNaN(idA)) return 1;
    if (isNaN(idB)) return -1;
    
    // Sort in descending order (highest number first)
    return idB - idA;
  });
}
