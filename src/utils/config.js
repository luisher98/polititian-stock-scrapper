/**
 * @fileoverview Application configuration and constants.
 * Manages environment variables and configuration settings.
 * @module utils/config
 */

import { promisify } from "util";
import dotenv from "dotenv";
import chalk from "chalk";

// Load and validate environment variables
dotenv.config();

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'OPENAI_ASSISTANT_ID',
  'PORT',
  'SERVER_NAME'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Time constants
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * @typedef {Object} OpenAIConfig
 * @property {string} apiKey - OpenAI API key from environment
 * @property {string} assistantId - OpenAI Assistant ID for processing
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} host - Database host address
 * @property {number} port - Database port number
 * @property {string} user - Database username
 * @property {string} password - Database password
 * @property {string} database - Database name
 */

/**
 * @typedef {Object} AppConfig
 * @property {OpenAIConfig} openai - OpenAI configuration settings
 * @property {DatabaseConfig} database - Database connection settings
 * @property {number} port - Application server port
 */

/**
 * Application configuration object.
 * Validates and provides access to all configuration settings.
 * 
 * @type {AppConfig}
 * @throws {Error} If required environment variables are missing
 */
export const CONFIG = {
  server: {
    port: parseInt(process.env.PORT) || 5000,
    name: process.env.SERVER_NAME || 'http://localhost',
    scrapperFrequencyMinutes: parseInt(process.env.SCRAPPER_FREQUENCY_MINUTES) || 60
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    assistantId: process.env.OPENAI_ASSISTANT_ID,
    maxRetries: 3,
    timeout: 5 * MINUTE,
    pollInterval: SECOND
  },
  files: {
    maxPdfSize: 25 * 1024 * 1024, // 25MB
    tempDir: './src/temp',
    cleanupInterval: HOUR
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "politician_trades",
  },
  port: parseInt(process.env.PORT || "3000", 10),
};

/**
 * Error messages used throughout the application.
 * Centralized for consistency and easy maintenance.
 * 
 * @enum {string}
 */
export const ERROR_MESSAGES = {
  PDF_TOO_LARGE: 'PDF file exceeds maximum size limit',
  INVALID_PDF: 'Invalid or corrupted PDF file',
  OPENAI_RATE_LIMIT: 'OpenAI API rate limit exceeded',
  OPENAI_TIMEOUT: 'OpenAI request timed out',
  FILE_NOT_FOUND: 'PDF file not found',
  INVALID_JSON: 'Failed to parse OpenAI response as JSON',
  NO_TRANSACTIONS: 'No valid transactions found in the response',
  INVALID_DATA: 'Invalid or missing transaction data',
  MISSING_FILING_INFO: 'Missing or invalid filing information',
  EMPTY_RESPONSE: 'Empty response from OpenAI',
  VALIDATION_FAILED: 'Data validation failed',
  PROCESSING_FAILED: 'Failed to process PDF data after all retries',
  MISSING_ENV_VAR: (varName) => `Missing required environment variable: ${varName}`,
  DB_CONNECTION: "Failed to connect to database",
  API_ERROR: "API request failed",
};

export const sleep = promisify(setTimeout);

// Exponential backoff for retries
export const retryDelays = [
  0,              // Immediate
  3 * MINUTE,     // 3 minutes
  7 * MINUTE,     // 7 minutes
  30 * MINUTE,    // 30 minutes
  8 * HOUR,       // 8 hours
];

/**
 * Instructions for the OpenAI assistant.
 * Guides the AI in processing transaction PDFs.
 * 
 * @type {string}
 */
export const assistantInstructions = `
Please analyze this PDF document and extract the following information in a structured JSON format:

1. Filing Information:
   - Name of the politician
   - Filing Status
   - State/District

2. Transaction Details (for each transaction):
   - Owner ID (who made the transaction)
   - Asset name/description
   - Transaction type (Purchase, Sale, Exchange)
   - Transaction date
   - Amount of transaction (in ranges if specified)

Please format the output as a JSON object with two main sections:
1. "Filing_Information" containing the filing details
2. "Transactions" as an array of individual transaction objects

Example format:
{
  "Filing_Information": {
    "Name": "Last, First",
    "Status": "Filed",
    "State_District": "XX00"
  },
  "Transactions": [
    {
      "ID_Owner": "Self",
      "Asset": "Company Stock",
      "Transaction_Type": "Purchase",
      "Date": "2023-01-01",
      "Amount": "$1,001 - $15,000"
    }
  ]
}

Important notes:
- Maintain exact field names as shown
- Include all transactions found in the document
- Preserve original text formatting for asset names
- Use consistent date format (YYYY-MM-DD)
- Include dollar signs in amount ranges
`;

/**
 * Validates the presence of a required environment variable.
 * 
 * @param {string} name - Name of the environment variable
 * @returns {string} Value of the environment variable
 * @throws {Error} If the environment variable is missing
 */
function validateEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(chalk.red(`❌ ${ERROR_MESSAGES.MISSING_ENV_VAR(name)}`));
    throw new Error(ERROR_MESSAGES.MISSING_ENV_VAR(name));
  }
  return value;
}
