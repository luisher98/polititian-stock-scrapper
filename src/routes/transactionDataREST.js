/**
 * @fileoverview REST API routes for transaction data.
 * Handles HTTP endpoints for retrieving transaction information.
 * @module routes/transactionDataREST
 */

import express from "express";
import chalk from "chalk";
import { getLatestTransactionData } from "../db/db.js";

const router = express.Router();

/**
 * Retrieves the latest transaction data.
 * 
 * @route GET /api/latest
 * @returns {Object} Latest transaction data
 * @throws {Error} If database query fails
 */
router.get("/latest", async (req, res) => {
  try {
    console.log(chalk.blue("🔍 Processing GET /api/latest request"));
    const data = await getLatestTransactionData();
    
    if (!data) {
      console.log(chalk.yellow("ℹ️  No transaction data available"));
      res.status(404).json({ 
        error: "No transaction data found" 
      });
      return;
    }

    console.log(chalk.green("✅ Latest transaction data retrieved"));
    res.json(data);
  } catch (error) {
    console.error(chalk.red("❌ Error retrieving latest transaction:"));
    console.error(chalk.red(`  • ${error.message}`));
    res.status(500).json({ 
      error: "Failed to retrieve transaction data",
      details: error.message
    });
  }
});

export default router; 