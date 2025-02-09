/**
 * @fileoverview Server-Sent Events (SSE) route for transaction updates.
 * Handles real-time transaction data streaming to clients.
 * @module routes/transactionDataSSE
 */

import express from "express";
import chalk from "chalk";

const router = express.Router();

/**
 * @typedef {Object} SSEClient
 * @property {express.Response} response - Express response object for the client
 * @property {string} id - Unique identifier for the client
 */

/** @type {Set<SSEClient>} Set of connected SSE clients */
const clients = new Set();

/**
 * Initializes SSE connection for a client.
 * Sets up headers and keeps connection alive.
 * 
 * @route GET /api/sse
 * @returns {void}
 */
router.get("/", (req, res) => {
  console.log(chalk.blue("🔌 New SSE client connected"));

  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Create client object with unique ID
  const clientId = Date.now();
  const client = {
    id: clientId,
    response: res,
  };

  // Add client to the set
  clients.add(client);
  console.log(chalk.green(`✅ Client ${clientId} registered`));
  console.log(chalk.blue(`📊 Total clients: ${chalk.white(clients.size)}`));

  // Remove client on connection close
  req.on("close", () => {
    clients.delete(client);
    console.log(chalk.yellow(`🔌 Client ${clientId} disconnected`));
    console.log(chalk.blue(`📊 Total clients: ${chalk.white(clients.size)}`));
  });
});

/**
 * Sends an SSE message to all connected clients.
 * 
 * @param {Object} data - Data to send to clients
 * @param {string} [eventType="message"] - Type of SSE event
 */
export function sendSSEUpdate(data, eventType = "message") {
  clients.forEach(client => {
    try {
      client.response.write(`event: ${eventType}\n`);
      client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(chalk.red(`❌ Error sending to client ${client.id}:`));
      console.error(chalk.red(`  • ${error.message}`));
      clients.delete(client);
    }
  });
}

export default router; 