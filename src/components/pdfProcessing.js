/**
 * @fileoverview PDF processing component.
 * Handles downloading, processing, and cleanup of PDF files.
 * @module components/pdfProcessing
 */

import { downloadPDF, cleanupPDF } from "../utils/pdf.js";
import convertPDFToJSON from "../lib/openai.js";
import { sleep, retryDelays } from "../utils/config.js";
import { validateGeneratedOpenAiData } from "./dataValidation.js";
import { logSection, logSectionEnd, logProcessStart, logProcessEnd, logError, logInfo } from "../utils/logger.js";

// Cache for file path between try/finally blocks
let path = null;

/**
 * Processes a PDF transaction file.
 * Downloads, validates, and extracts data from the PDF.
 * 
 * @async
 * @param {Object} transactionData - Transaction metadata
 * @param {string} transactionData.pdfUrl - URL of the PDF to process
 * @param {string} transactionData.name - Politician's name from website
 * @param {string} transactionData.office - Office/district from website
 * @returns {Promise<Object|null>} Processed transaction data or null on failure
 */
export default async function processPDFTransactionData(transactionData) {
  const startTime = Date.now();
  const subProcessTimes = {};
  
  const {
    name: nameInWebsite,
    office: officeInWebsite,
    pdfUrl,
  } = transactionData;

  try {
    logSection('Processing PDF');
    
    // Download the PDF from the given URL, returning the path to the file
    const downloadStartTime = Date.now();
    path = await downloadPDF(pdfUrl);
    subProcessTimes['Download'] = (Date.now() - downloadStartTime) / 1000;

    // Upload the PDF to OpenAI and store the JSON in data
    logProcessStart('Converting PDF to structured data');
    const conversionStartTime = Date.now();
    let data = await convertPDFToJSON(path);
    subProcessTimes['OpenAI Conversion'] = (Date.now() - conversionStartTime) / 1000;

    // validate that the data from OpenAI is correct by comparing it to the website data
    const validationStartTime = Date.now();
    await validateGeneratedOpenAiData(data, nameInWebsite, officeInWebsite);
    subProcessTimes['Validation'] = (Date.now() - validationStartTime) / 1000;
    logProcessEnd(validationStartTime, 'Data validation');

    // Cleanup temporary files
    const cleanupStartTime = Date.now();
    await cleanupPDF(path);
    subProcessTimes['Cleanup'] = (Date.now() - cleanupStartTime) / 1000;
    
    logProcessEnd(startTime, 'PDF processing');
    logSectionEnd(startTime, subProcessTimes);
    return data;
  } catch (error) {
    logError('PDF processing failed', error);
    return null;
  }
}

/**
 * Retries processing a PDF file with exponential backoff.
 * 
 * @async
 * @param {string} path - Path to the PDF file
 * @returns {Promise<Object|null>} Processed data or null after all retries fail
 */
async function retryProcessPDFData(path) {
  let attempt = 0;
  while (attempt < retryDelays.length) {
    try {
      logInfo(`Attempt ${attempt + 1} to process PDF...`, '🔄');
      return await convertPDFToJSON(path);
    } catch (error) {
      const delay = retryDelays[attempt];
      const delayMinutes = Math.floor(delay / 60000);
      const delaySeconds = (delay % 60000) / 1000;
      
      logError(`Processing failed on attempt ${attempt + 1}`, error);
      
      if (attempt === retryDelays.length - 1) {
        logError('All retry attempts failed');
        break;
      }
      
      const timeUnit = delay > 60000 ? "minutes" : "seconds";
      const timeValue = delay > 60000 ? delayMinutes : delaySeconds;
      logInfo(`Retrying in ${timeValue} ${timeUnit}...`, '⏳');
      
      await sleep(delay);
      attempt++;
    }
  }
  
  logError('Failed to process PDF after multiple attempts');
  return null;
}
