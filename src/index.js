/**
 * @fileoverview Main application entry point.
 * Sets up Express server, routes, and transaction monitoring.
 * @module index
 */

import express from "express";
import cors from "cors";
import chalk from "chalk";
import { CONFIG } from "./utils/config.js";
import transactionDataSSE from "./routes/transactionDataSSE.js";
import transactionDataREST from "./routes/transactionDataREST.js";
import { sendSSEUpdate } from "./routes/transactionDataSSE.js";
import checkAndUpdateLatestTransactionData from "./services/checkLastTransaction.js";

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Route setup
app.use("/api/sse", transactionDataSSE);
app.use("/api", transactionDataREST);

/**
 * Gets current timestamp in HH:mm:ss format
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return chalk.gray(`[${new Date().toLocaleTimeString()}]`);
}

/**
 * Calculate time difference in seconds with 2 decimal places
 * @param {Date} startTime 
 * @returns {string}
 */
function getProcessingTime(startTime) {
  const diff = (Date.now() - startTime) / 1000;
  return chalk.yellow(`[${diff.toFixed(2)}s]`);
}

/**
 * Starts the filing monitoring process.
 * Periodically checks for new filings and notifies clients.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function startFilingMonitoring() {
  console.log(chalk.bold.cyan("\n=== Starting Filing Monitor ===\n"));
  
  try {
    const startTime = Date.now();
    await checkAndUpdateLatestTransactionData((update) => {
      if (update.status === "alert") {
        console.log(`${getTimestamp()} ${getProcessingTime(startTime)} ${chalk.green("🔔 New filing detected, notifying clients\n")}`);
        sendSSEUpdate(update);
      } else if (update.status === "error") {
        console.error(`${getTimestamp()} ${getProcessingTime(startTime)} ${chalk.red("❌ Filing processing error:")}`);
        console.error(chalk.red(`  • ${update.message}\n`));
        sendSSEUpdate(update);
      }
    });
  } catch (error) {
    console.error(`${getTimestamp()} ${chalk.red("❌ Monitor Error:")}`);
    console.error(chalk.red(`  • ${error.message}\n`));
  }

  // Schedule next check
  setTimeout(startFilingMonitoring, CONFIG.checkInterval || 60000);
}

// Start the server
const port = CONFIG.port || 3000;
app.listen(port, () => {
  console.log(chalk.bold.cyan("\n=== Politician Stock Filing Tracker ===\n"));
  console.log(`${getTimestamp()} ${chalk.blue(`🚀 Server running on port ${chalk.white(port)}`)}`);
  console.log(`${getTimestamp()} ${chalk.blue(`📡 SSE URL: ${chalk.white(`http://localhost:${port}/api/sse`)}`)}`);
  console.log(chalk.blue("\n📡 Starting filing monitoring...\n"));
  
  // Start monitoring after server is running
  startFilingMonitoring().catch(error => {
    console.error(`${getTimestamp()} ${chalk.red("❌ Failed to start filing monitoring:")}`);
    console.error(chalk.red(`  • ${error.message}\n`));
    process.exit(1);
  });
});
