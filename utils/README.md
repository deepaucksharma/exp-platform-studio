# DStudio Unified Utilities

This directory contains standardized utility modules for DStudio scripts and tools. These modules have been created to improve code quality, maintainability, and reduce duplication across the codebase.

## Core Design Principles

1. **Consistent Error Handling**: All functions return results in a standardized format with success/failure flags and proper error objects
2. **Async/Sync Pattern Consistency**: Both async and sync versions of functions where appropriate
3. **Logging Standardization**: Centralized logging system with levels and scoping
4. **DRY (Don't Repeat Yourself)**: Elimination of duplicate code across scripts
5. **Security**: Safe filesystem operations with proper permissions checking

## Module Structure

### Core Modules

- **`index.js`**: Main export of all utility modules
- **`logger.js`**: Unified logging system with levels and scoped loggers
- **`error-utils.js`**: Standardized error types and handling patterns
- **`path-utils.js`**: Path operations with consistent patterns
- **`file-utils.js`**: File system operations with error handling
- **`config-utils.js`**: Configuration management and access

### Domain-Specific Modules

- **`cache-utils.js`**: Cache directory management and cleanup
- **`project-utils.js`**: DStudio-specific project operations

## Usage Examples

### Basic Import

```javascript
// Import all utilities
const utils = require('../utils');

// Or import specific modules
const { logger, file, error } = require('../utils');
```

### Logging

```javascript
// Create a scoped logger
const logger = utils.logger.createScopedLogger('MyScript');

// Log at different levels
logger.info('Operation started');
logger.debug('Detailed information');
logger.warn('Warning condition');
logger.error('Error condition');
```

### Error Handling

```javascript
// Use try/catch with standardized error handler
try {
  // Your code here
} catch (err) {
  utils.error.createErrorHandler('script-name')(err);
}

// Or use the withErrorHandling wrapper
const safeFunction = utils.error.withErrorHandling(riskyFunction, {
  exitOnError: true,
  logErrors: true
});

// Try pattern for clean error handling
const result = await utils.error.tryAsync(async () => {
  // Async operation
});

if (result.success) {
  console.log(result.value);
} else {
  console.error(result.error.message);
}
```

### File Operations

```javascript
// Read a file with clean error handling
const fileResult = await utils.file.readFile('path/to/file.txt');
if (fileResult.success) {
  console.log(fileResult.value);
}

// Write to a file
await utils.file.writeFile('path/to/file.txt', 'content');
```

### Path Operations

```javascript
// Get project-relative path
const configPath = utils.path.resolveProjectPath('.agent-config.json');

// Check if path exists
if (utils.path.pathExists(configPath)) {
  // Do something
}

// Ensure directory exists
utils.path.ensureDir(utils.path.resolveProjectPath('.cache/temp'));
```

## Best Practices

1. **Always use error handling utilities** rather than raw try/catch blocks
2. **Use the logger** instead of console.log for consistent output
3. **Check success flags** before using result values
4. **Use path utilities** for consistent path handling
5. **Create scoped loggers** for each script for better log organization

## Migration Guide

When migrating existing scripts to use these utilities:

1. Replace direct `fs` calls with `utils.file` functions
2. Replace `console.log` with `utils.logger` functions
3. Replace error handling with `utils.error` utilities
4. Replace path manipulation with `utils.path` functions
5. Replace configuration access with `utils.config` functions
