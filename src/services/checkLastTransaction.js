/**
 * @fileoverview Service to check and process new politician filing data.
 * Monitors for new PDF filings and processes them into structured JSON data.
 * @module services/checkLastTransaction
 */

import processPDFTransactionData from "../components/pdfProcessing.js";
import { storeTransactionDataInDatabase } from "../db/db.js";
import { getLatestTransaction } from "../utils/transaction.js";
import { logSection, logSectionEnd, logProcessStart, logProcessEnd, logInfo, logWarning, logError } from "../utils/logger.js";

/** @type {string|null} Cache to avoid reprocessing the same PDF */
let oldPDFUrl = null;

/**
 * @typedef {Object} TransactionUpdate
 * @property {'alert'|'error'|'finished checking'} status - The status of the filing check
 * @property {string} message - A descriptive message about the update
 * @property {string} [time] - ISO timestamp of the update
 * @property {string} [pdfUrl] - URL of the processed PDF
 * @property {Object} [transaction] - Processed filing data
 */

/**
 * Checks for new filing data and processes any new PDFs found.
 * Maintains state between runs using oldPDFUrl to avoid reprocessing.
 * 
 * @async
 * @param {function(TransactionUpdate): void} transactionUpdate - Callback for status updates
 * @throws {Error} If PDF processing fails after multiple attempts
 * @returns {Promise<void>}
 */
export default async function checkAndUpdateLatestTransactionData(
  transactionUpdate = () => {}
) {
  const checkStartTime = Date.now();
  const subProcessTimes = {};
  
  logSection('Checking for New Filings');

  if (oldPDFUrl === null) {
    logInfo('First run - will process latest filing');
  }

  const fetchStartTime = Date.now();
  const currentYear = new Date().getFullYear();
  const latestTransactionData = await getLatestTransaction(currentYear);
  subProcessTimes['Fetch Latest'] = (Date.now() - fetchStartTime) / 1000;
  
  if (!latestTransactionData) {
    logProcessEnd(checkStartTime, 'No filings found');
    logSectionEnd(checkStartTime, subProcessTimes);
    return;
  }

  const newPDFUrl = latestTransactionData.pdfUrl;
  logWarning('Committee membership check not yet implemented');

  // if the data is the same as the old data, no need to update
  if (oldPDFUrl === newPDFUrl) {
    logProcessEnd(checkStartTime, 'No new filings found');
    transactionUpdate({
      status: "finished checking",
      time: new Date().toISOString(),
      message: "No new filings found.",
    });
    logSectionEnd(checkStartTime, subProcessTimes);
    return;
  }

  // New filing detected, start processing
  logProcessStart(`Processing filing from ${latestTransactionData.name} (${latestTransactionData.office})`);

  const processingStartTime = Date.now();
  const detailedTransactionData = await processPDFTransactionData({
    pdfUrl: newPDFUrl,
    name: latestTransactionData.name,
    office: latestTransactionData.office
  });
  subProcessTimes['PDF Processing'] = (Date.now() - processingStartTime) / 1000;

  if (detailedTransactionData === null) {
    logError('Filing processing failed');
    logError('Multiple processing attempts failed');
    logError('Check logs for detailed error information');
    
    transactionUpdate({
      status: "error",
      message: "Error processing filing data correctly after multiple attempts.",
    });
    throw new Error("After multiple attempts, could not process filing data.");
  }

  const notifyStartTime = Date.now();
  transactionUpdate({
    status: "alert",
    message: "New filing data found!",
    time: new Date().toISOString(),
    pdfUrl: newPDFUrl,
    transaction: detailedTransactionData
  });
  subProcessTimes['Notify Clients'] = (Date.now() - notifyStartTime) / 1000;

  oldPDFUrl = newPDFUrl;
  logProcessEnd(checkStartTime, 'Filing check completed');
  logSectionEnd(checkStartTime, subProcessTimes);
}
