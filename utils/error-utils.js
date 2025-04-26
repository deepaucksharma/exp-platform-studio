/**
 * Error Handling Utilities
 * Standardized error types and error handling for consistent patterns
 */

const logger = require('./logger');

// Standard error types with codes
const ERROR_TYPES = {
  CONFIG: { code: 'CONFIG_ERR', exitCode: 1 },
  FILE_SYSTEM: { code: 'FS_ERR', exitCode: 2 },
  VALIDATION: { code: 'VAL_ERR', exitCode: 3 },
  EXECUTION: { code: 'EXEC_ERR', exitCode: 4 },
  NETWORK: { code: 'NET_ERR', exitCode: 5 },
  TIMEOUT: { code: 'TIMEOUT_ERR', exitCode: 6 },
  PERMISSION: { code: 'PERM_ERR', exitCode: 7 },
  UNKNOWN: { code: 'UNKNOWN_ERR', exitCode: 99 }
};

/**
 * Custom DStudio Error class with error codes and types
 */
class DStudioError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, originalError = null) {
    super(message);
    this.name = 'DStudioError';
    this.code = type.code;
    this.exitCode = type.exitCode;
    this.originalError = originalError;
  }
  
  /**
   * Get a detailed string representation of the error
   * @returns {string} Detailed error message
   */
  getDetailedMessage() {
    let msg = `[${this.code}] ${this.message}`;
    if (this.originalError) {
      msg += `\nCaused by: ${this.originalError.message}`;
    }
    return msg;
  }
}

/**
 * Create specialized error constructors for each error type
 */
const ConfigError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.CONFIG, originalError);

const FileSystemError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.FILE_SYSTEM, originalError);

const ValidationError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.VALIDATION, originalError);

const ExecutionError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.EXECUTION, originalError);

const NetworkError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.NETWORK, originalError);

const TimeoutError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.TIMEOUT, originalError);

const PermissionError = (message, originalError = null) => 
  new DStudioError(message, ERROR_TYPES.PERMISSION, originalError);

/**
 * Wrap a function with standardized error handling
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, options = {}) {
  const {
    exitOnError = false,
    logErrors = true,
    rethrow = true,
    defaultErrorType = ERROR_TYPES.UNKNOWN
  } = options;
  
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (err) {
      const error = err instanceof DStudioError ? 
        err : new DStudioError(err.message, defaultErrorType, err);
      
      if (logErrors) {
        logger.error(error.getDetailedMessage());
      }
      
      if (exitOnError) {
        process.exit(error.exitCode);
      }
      
      if (rethrow) {
        throw error;
      }
      
      return null;
    }
  };
}

/**
 * Try a function and return a result object with success status
 * @param {Function} fn - Function to try
 * @param {any} defaultValue - Default value if function fails
 * @returns {Object} Result object with success status, value, and error
 */
async function tryAsync(fn, defaultValue = null) {
  try {
    const result = await fn();
    return {
      success: true,
      value: result,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      value: defaultValue,
      error: err instanceof DStudioError ? err : new DStudioError(err.message, ERROR_TYPES.UNKNOWN, err)
    };
  }
}

/**
 * Synchronous version of tryAsync
 * @param {Function} fn - Function to try
 * @param {any} defaultValue - Default value if function fails
 * @returns {Object} Result object with success status, value, and error
 */
function trySync(fn, defaultValue = null) {
  try {
    const result = fn();
    return {
      success: true,
      value: result,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      value: defaultValue,
      error: err instanceof DStudioError ? err : new DStudioError(err.message, ERROR_TYPES.UNKNOWN, err)
    };
  }
}

/**
 * Create a generic error handler for scripts
 * @param {string} scriptName - Name of the script
 * @returns {Function} Error handler function
 */
function createErrorHandler(scriptName) {
  return (err) => {
    const error = err instanceof DStudioError ? 
      err : new DStudioError(err.message, ERROR_TYPES.UNKNOWN, err);
    
    logger.error(`[${scriptName}] ${error.getDetailedMessage()}`);
    process.exit(error.exitCode);
  };
}

module.exports = {
  DStudioError,
  ERROR_TYPES,
  ConfigError,
  FileSystemError,
  ValidationError,
  ExecutionError,
  NetworkError,
  TimeoutError,
  PermissionError,
  withErrorHandling,
  tryAsync,
  trySync,
  createErrorHandler
};
