/**
 * @fileoverview PDF download and processing utilities.
 * Handles downloading and saving PDF files from transaction URLs.
 * @module utils/pdf
 */

import { writeFile, unlink, mkdir, readdir, rmdir } from "node:fs/promises";
import { get } from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { logInfo, logSuccess, logError, logWarning } from "./logger.js";

/**
 * Downloads a PDF file from a given URL and saves it locally.
 * Creates necessary directories if they don't exist.
 * 
 * @async
 * @param {string} url - The URL of the PDF to download
 * @param {string} [outputDir="pdfs"] - Directory to save the PDF in
 * @returns {Promise<string>} Path to the downloaded PDF file
 * @throws {Error} If download or file write fails
 */
export async function downloadPDF(url, outputDir = "pdfs") {
  if (!url) {
    throw new Error("No URL provided for PDF download");
  }

  try {
    logInfo('Downloading PDF...', '📥');
    
    // Extract ID from URL
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/");
    const pdfId = pathSegments[pathSegments.length - 1].replace(".pdf", "");

    // Create output directory if it doesn't exist
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pdfDir = join(__dirname, "..", "..", outputDir);
    if (!existsSync(pdfDir)) {
      await mkdir(pdfDir, { recursive: true });
    }

    // Set up output path
    const outputPath = join(pdfDir, `${pdfId}.pdf`);

    // Download and save the PDF
    const pdfData = await new Promise((resolve, reject) => {
      get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download PDF: ${res.statusMessage}`));
          return;
        }

        const data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => resolve(Buffer.concat(data)));
        res.on("error", reject);
      }).on("error", reject);
    });

    await writeFile(outputPath, pdfData);
    logSuccess('PDF downloaded successfully');
    logInfo(`Saved to: ${outputPath}`, '📁');

    return outputPath;
  } catch (error) {
    logError('PDF Download Failed', error);
    throw error;
  }
}

/**
 * Cleans up downloaded PDF files.
 * Removes the specified file and its parent directory if empty.
 * 
 * @async
 * @param {string} filePath - Path to the PDF file to delete
 * @returns {Promise<void>}
 */
export async function cleanupPDF(filePath) {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
      logInfo(`Deleted temporary PDF: ${filePath}`, '🗑️');
      
      // Try to remove parent directory if empty
      const dir = dirname(filePath);
      const files = await readdir(dir);
      if (files.length === 0) {
        await rmdir(dir);
        logInfo(`Removed empty directory: ${dir}`, '🗑️');
      }
    }
  } catch (error) {
    logWarning(`Failed to cleanup PDF file: ${error.message}`);
    // Non-critical error, don't throw
  }
}
