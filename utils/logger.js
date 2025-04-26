/**
 * Unified Logging System
 * Provides consistent logging across all scripts with timestamps, colors, and log levels
 */

const chalk = require('chalk');

// Log levels with corresponding colors and priorities
const LOG_LEVELS = {
  ERROR: { color: 'red', priority: 0 },
  WARN: { color: 'yellow', priority: 1 },
  INFO: { color: 'blue', priority: 2 },
  DEBUG: { color: 'gray', priority: 3 },
  TRACE: { color: 'magenta', priority: 4 }
};

// Default log level from environment or config
let currentLogLevel = process.env.LOG_LEVEL || 'INFO';

/**
 * Set the current log level
 * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG, TRACE)
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level]) {
    currentLogLevel = level;
  } else {
    console.error(`Invalid log level: ${level}`);
  }
}

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString();
  const levelConfig = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  const colorFunc = chalk[levelConfig.color];
  
  return `${timestamp} ${colorFunc(level.padEnd(5))}: ${message}`;
}

/**
 * Log a message with a specific level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to format into the message
 */
function log(level, message, ...args) {
  // Check if we should log at this level
  const targetPriority = LOG_LEVELS[level]?.priority || 0;
  const currentPriority = LOG_LEVELS[currentLogLevel]?.priority || 0;
  
  if (targetPriority > currentPriority) return;
  
  // Format message with additional arguments
  let formattedMessage = message;
  if (args.length > 0) {
    try {
      formattedMessage = message.replace(/{(\d+)}/g, (match, index) => {
        return typeof args[index] !== 'undefined' ? 
          (typeof args[index] === 'object' ? JSON.stringify(args[index]) : args[index]) : 
          match;
      });
    } catch (err) {
      console.error(`Error formatting log message: ${err.message}`);
    }
  }
  
  // Output the log
  console.log(formatLogMessage(level, formattedMessage));
}

// Create convenience methods for each log level
function error(message, ...args) {
  log('ERROR', message, ...args);
}

function warn(message, ...args) {
  log('WARN', message, ...args);
}

function info(message, ...args) {
  log('INFO', message, ...args);
}

function debug(message, ...args) {
  log('DEBUG', message, ...args);
}

function trace(message, ...args) {
  log('TRACE', message, ...args);
}

/**
 * Create a scoped logger for a specific component
 * @param {string} componentName - Name of the component
 * @returns {Object} Scoped logger
 */
function createScopedLogger(componentName) {
  return {
    error: (message, ...args) => error(`[${componentName}] ${message}`, ...args),
    warn: (message, ...args) => warn(`[${componentName}] ${message}`, ...args),
    info: (message, ...args) => info(`[${componentName}] ${message}`, ...args),
    debug: (message, ...args) => debug(`[${componentName}] ${message}`, ...args),
    trace: (message, ...args) => trace(`[${componentName}] ${message}`, ...args)
  };
}

module.exports = {
  setLogLevel,
  log,
  error,
  warn,
  info,
  debug,
  trace,
  createScopedLogger,
  LOG_LEVELS
};
