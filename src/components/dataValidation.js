/**
 * @fileoverview Data validation component.
 * Validates transaction data from OpenAI against website data.
 * @module components/dataValidation
 */

import { logSection, logSectionEnd, logInfo, logWarning, logError, logValidation, logSuccess } from "../utils/logger.js";

/**
 * @typedef {Object} WebsiteData
 * @property {string} name - Politician's name from the website
 * @property {string} office - Office/district from the website
 */

/**
 * @typedef {Object} TransactionData
 * @property {string} firstName - Extracted first name from filing
 * @property {string} office - Office/district from filing
 */

/**
 * Normalizes a name for comparison by:
 * - Removing titles (Hon., Dr., etc.)
 * - Removing punctuation
 * - Converting to lowercase
 * - Sorting name parts to handle different orderings
 * 
 * @param {string} name Name to normalize
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    // Remove common titles
    .replace(/^hon\.?\s+/i, '')
    .replace(/^dr\.?\s+/i, '')
    .replace(/\s+mrs\.?\s+/i, ' ')
    .replace(/\s+mr\.?\s+/i, ' ')
    // Remove all punctuation including dots and commas
    .replace(/[.,]/g, '')
    // Split into parts and remove empty/whitespace parts
    .split(/\s+/)
    .filter(part => part.length > 0)
    // Remove suffixes like Jr., III, etc.
    .filter(part => !part.match(/^(jr|sr|[ivx]+|[1-9](?:st|nd|rd|th))$/))
    // Sort parts to handle different orderings
    .sort()
    .join(' ');
}

/**
 * Validates transaction data from OpenAI against website data.
 * 
 * @async
 * @param {Object} data - Transaction data from OpenAI
 * @param {string} nameInWebsite - Politician name from website
 * @param {string} officeInWebsite - Office/district from website
 * @returns {Promise<void>}
 * @throws {Error} If validation fails
 */
export async function validateGeneratedOpenAiData(
  data,
  nameInWebsite,
  officeInWebsite
) {
  try {
    logSection('Data Validation');
    
    // Early validation of input parameters
    if (!nameInWebsite || !officeInWebsite) {
      logWarning('Missing website data - limited validation possible');
      if (!hasTransactions(data)) {
        throw new Error('No transactions found in processed data');
      }
      return;
    }

    const websiteData = {
      name: nameInWebsite,
      office: officeInWebsite,
    };

    logInfo('Validating politician information...');
    const transactionData = await getTransactionFirstNameAndOffice(data);

    // Validate name and office
    const normalizedWebsiteName = normalizeName(websiteData.name);
    const normalizedTransactionName = normalizeName(transactionData.name);
    const nameMatch = normalizedWebsiteName === normalizedTransactionName;
    
    const officeMatch = transactionData.office.toLowerCase().includes(websiteData.office.toLowerCase());
    
    logValidation('Name match', nameMatch);
    logValidation('Office match', officeMatch);

    if (!nameMatch || !officeMatch) {
      logInfo('Data mismatch detected');
      logInfo(`  Name: ${websiteData.name}`, '📋');
      logInfo(`  Normalized: ${normalizedWebsiteName}`);
      logInfo(`  Name: ${transactionData.name}`, '📄');
      logInfo(`  Normalized: ${normalizedTransactionName}`);
      logInfo(`  Office: ${websiteData.office} vs ${transactionData.office}`);
      
      // If only the name doesn't match but office does, and normalized names are close,
      // we can proceed with a warning instead of failing
      if (officeMatch && normalizedWebsiteName.includes(normalizedTransactionName) || 
          normalizedTransactionName.includes(normalizedWebsiteName)) {
        logInfo('Names are similar enough to proceed with caution');
      } else {
        throw new Error('Data mismatch between website and filing');
      }
    }

    // Validate transactions
    if (!hasTransactions(data)) {
      throw new Error('No transactions found in processed data');
    }

    logSuccess(`Found ${data.Transactions.length} transaction(s)`);
    logSectionEnd();
  } catch (error) {
    logError('Validation failed', error);
    throw error;
  }
}

/**
 * Extracts name and office from transaction data.
 * 
 * @async
 * @param {Object} data - Transaction data
 * @returns {Promise<Object>} Name and office data
 */
async function getTransactionFirstNameAndOffice(data) {
  return {
    name: data.Filing_Information.Name,
    office: data.Filing_Information.State_District,
  };
}

/**
 * Checks if transaction data contains transactions.
 * 
 * @param {Object} data - Transaction data
 * @returns {boolean} Whether transactions exist
 */
function hasTransactions(data) {
  return (
    data &&
    data.Transactions &&
    Array.isArray(data.Transactions) &&
    data.Transactions.length > 0
  );
}

/**
 * Extracts JSON content from between backticks in a text response.
 * Handles both ```json and ``` code blocks.
 * 
 * @param {string} text - The text to extract JSON from
 * @returns {string|false} The extracted JSON string or false if not found
 */
export function extractStringBetweenBackticks(text) {
  try {
    // First try to find JSON block with json tag
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/;
    const jsonMatch = text.match(jsonBlockRegex);
    
    if (jsonMatch) {
      const extracted = jsonMatch[1].trim();
      try {
        // Validate it's proper JSON
        JSON.parse(extracted);
        return extracted;
      } catch (e) {
        console.log("Found JSON block but content is not valid JSON, trying other matches");
      }
    }

    // If no valid JSON block found, try other backtick blocks
    const regex = /```([\s\S]*?)```/g;
    let matches = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const content = match[1].trim();
      // Skip if content starts with obvious non-JSON text
      if (content.startsWith('The') || content.startsWith('Given')) {
        continue;
      }
      try {
        // Try to parse as JSON to validate
        JSON.parse(content);
        return content; // Return first valid JSON found
      } catch (e) {
        continue;
      }
    }

    // If we get here, we couldn't find valid JSON
    console.error("Could not find valid JSON in response. Full response:", text);
    return false;
  } catch (error) {
    console.error(
      "Error extracting JSON from response:",
      error,
      "\nFull response:",
      text
    );
    return false;
  }
}

/**
 * Checks if a string is valid JSON.
 * 
 * @param {string} obj - The string to check
 * @returns {boolean} True if string is valid JSON
 */
export function isJSON(obj) {
  if (typeof text !== "string") {
    return false;
  }
  try {
    JSON.parse(obj);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * @typedef {Object} TransactionFields
 * @property {string} ID_Owner - Owner of the transaction
 * @property {string} Asset - Asset name/description
 * @property {string} Transaction_Type - Type of transaction
 * @property {string} Date - Transaction date
 * @property {string} Amount - Transaction amount
 */

/**
 * Validates the structure and content of transaction data.
 * Cleans up malformed data if possible.
 * 
 * @param {Object} data - The transaction data to validate
 * @returns {boolean} True if data is valid
 */
export function validateTransactionData(data) {
  if (!data || typeof data !== 'object') {
    console.error('Invalid data format: data must be an object');
    return false;
  }

  // Clean up any malformed data
  if (data.Transactions) {
    data.Transactions = data.Transactions.map(transaction => ({
      ...transaction,
      // Clean up amount field (remove newlines and ensure $ symbol)
      Amount: transaction.Amount?.replace(/\n/g, '')?.replace(/^(?!\$)/, '$'),
      // Clean up asset field (remove garbled text and newlines)
      Asset: transaction.Asset?.replace(/[\uFFFD\u0000-\u001F]/g, '')
        ?.replace(/\n/g, ' ')
        ?.replace(/\s+/g, ' ')
        ?.trim()
    }));
  }

  const requiredFields = {
    Filing_Information: ['Name', 'Status', 'State_District'],
    Transactions: ['ID_Owner', 'Asset', 'Transaction_Type', 'Date', 'Amount']
  };

  // Check Filing_Information
  if (!data.Filing_Information || typeof data.Filing_Information !== 'object') {
    console.error('Missing or invalid Filing_Information');
    return false;
  }

  for (const field of requiredFields.Filing_Information) {
    if (!data.Filing_Information[field]) {
      console.error(`Missing required field in Filing_Information: ${field}`);
      return false;
    }
  }

  // Check Transactions
  if (!Array.isArray(data.Transactions) || data.Transactions.length === 0) {
    console.error('Missing or invalid Transactions array');
    return false;
  }

  for (const transaction of data.Transactions) {
    for (const field of requiredFields.Transactions) {
      if (!transaction[field]) {
        console.error(`Missing required field in Transaction: ${field}`);
        return false;
      }
    }
  }

  return true;
}
