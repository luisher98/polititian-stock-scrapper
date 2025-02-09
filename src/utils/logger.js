/**
 * @fileoverview Centralized logging utility.
 * Provides consistent logging format across the application.
 * @module utils/logger
 */

import chalk from 'chalk';

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
  return chalk.yellow(`${diff.toFixed(2)}s`);
}

/**
 * Format timing details
 * @param {number} startTime 
 * @param {Object} subProcessTimes - Map of subprocess names to their durations
 * @returns {string}
 */
function formatTimingDetails(startTime, subProcessTimes = {}) {
  const totalTime = (Date.now() - startTime) / 1000;
  
  // Format subprocess times
  const details = Object.entries(subProcessTimes)
    .map(([name, time]) => `    ${name.padEnd(20)} ${chalk.yellow(time.toFixed(2))}s`)
    .join('\n');
  
  return `\n  Process Times:\n    ${'Total'.padEnd(20)} ${chalk.yellow(totalTime.toFixed(2))}s\n${details}`;
}

/**
 * Log a section header
 * @param {string} title Section title
 */
export function logSection(title) {
  const line = '═'.repeat(Math.max(0, 60 - title.length));
  console.log(chalk.cyan(`\n=== ${chalk.bold(title)} ${line}\n`));
}

/**
 * Log a section end with detailed timing
 * @param {number} startTime Start time of the section
 * @param {Object} subProcessTimes Map of subprocess names to their durations
 */
export function logSectionEnd(startTime, subProcessTimes = {}) {
  if (startTime) {
    console.log(formatTimingDetails(startTime, subProcessTimes));
  }
  console.log('\n' + chalk.cyan('═'.repeat(63)) + '\n');
}

/**
 * Log the start of a major process
 * @param {string} message Process description
 */
export function logProcessStart(message) {
  console.log(`${getTimestamp()} ${chalk.blue('►')} ${message}`);
}

/**
 * Log the end of a process with timing
 * @param {number} startTime Process start time
 * @param {string} message Process completion message
 */
export function logProcessEnd(startTime, message) {
  console.log(`  ${chalk.green('✓')} ${message.padEnd(30)} ${chalk.gray(`(${getProcessingTime(startTime)})`)}`);
}

/**
 * Log an info message
 * @param {string} message Information message
 * @param {string} [emoji='ℹ️'] Emoji to use
 */
export function logInfo(message, emoji = 'ℹ️') {
  console.log(`  ${emoji}  ${message}`);
}

/**
 * Log a success message
 * @param {string} message Success message
 */
export function logSuccess(message) {
  console.log(`  ${chalk.green('✓')} ${message}`);
}

/**
 * Log a warning message
 * @param {string} message Warning message
 */
export function logWarning(message) {
  console.log(`  ${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
}

/**
 * Log an error message
 * @param {string} message Error message
 * @param {Error} [error] Optional error object
 */
export function logError(message, error = null) {
  console.log(`  ${chalk.red('✗')} ${chalk.red(message)}`);
  if (error?.message) {
    console.log(`    ${chalk.red('•')} ${error.message}`);
  }
}

/**
 * Log a validation result
 * @param {string} field Field being validated
 * @param {boolean} passed Whether validation passed
 */
export function logValidation(field, passed) {
  const icon = passed ? chalk.green('✓') : chalk.red('✗');
  const status = passed ? chalk.green(field) : chalk.red(field);
  console.log(`    ${icon} ${status}`);
}

/**
 * Log a debug message (only in development)
 * @param {string} message Debug message
 */
export function logDebug(message) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`  ${chalk.gray('›')} ${message}`);
  }
} 