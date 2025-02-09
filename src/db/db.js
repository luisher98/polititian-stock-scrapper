/**
 * @fileoverview Database operations for transaction data storage.
 * Handles MongoDB connections and transaction data persistence.
 * @module db/db
 */

import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import chalk from "chalk";

dotenv.config();

const MONGODB_USER = process.env.MONGODB_USER;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI;

const uri = `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_URI}`;
const client = new MongoClient(uri);

/**
 * @typedef {Object} FilingInformation
 * @property {string} Name - Politician's name
 * @property {string} Status - Filing status
 * @property {string} State_District - State and district information
 */

/**
 * @typedef {Object} Transaction
 * @property {string} ID_Owner - Owner of the transaction
 * @property {string} Asset - Asset name/description
 * @property {string} Transaction_Type - Type of transaction
 * @property {string} Date - Transaction date
 * @property {string} Amount - Transaction amount range
 */

/**
 * @typedef {Object} TransactionData
 * @property {FilingInformation} Filing_Information - Filing details
 * @property {Transaction[]} Transactions - Array of transactions
 */

/**
 * Retrieves the latest transaction data from the database.
 * 
 * @async
 * @returns {Promise<TransactionData|null>} The latest transaction data or null if none found
 * @throws {Error} If database operations fail
 */
export async function getLatestTransactionData() {
  try {
    console.log(chalk.blue("🔍 Fetching latest transaction data..."));
    await client.connect();
    
    const collection = client
      .db("polititian-transactions")
      .collection("transactions-test");
    
    const result = await collection
      .find({})
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (result.length > 0) {
      console.log(chalk.green("✅ Latest transaction data retrieved"));
      return result[0];
    } else {
      console.log(chalk.yellow("ℹ️  No transaction data found"));
      return null;
    }
  } catch (error) {
    console.error(chalk.red("❌ Database Error:"));
    console.error(chalk.red(`  • ${error.message}`));
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Stores transaction data in the database.
 * Creates a new document in the transactions collection.
 * 
 * @async
 * @param {TransactionData} transactionData - Transaction data to store
 * @returns {Promise<void>}
 * @throws {Error} If database operations fail
 */
export async function storeTransactionDataInDatabase(transactionData) {
  try {
    console.log(chalk.blue("💾 Storing transaction data..."));
    await client.connect();
    
    // Verify connection
    await client.db("admin").command({ ping: 1 });
    console.log(chalk.green("✅ Connected to MongoDB"));

    const collection = client
      .db("polititian-transactions")
      .collection("transactions-test");
    
    const result = await collection.insertOne(transactionData);
    console.log(chalk.green("✅ Transaction data stored successfully"));
    console.log(chalk.blue(`📝 Document ID: ${chalk.white(result.insertedId)}`));
  } catch (error) {
    console.error(chalk.red("❌ Database Error:"));
    console.error(chalk.red(`  • ${error.message}`));
    throw error;
  } finally {
    await client.close();
  }
}
