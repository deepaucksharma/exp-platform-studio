#!/usr/bin/env node

/**
 * DStudio Utilities Demo
 * This script demonstrates the usage of all utility modules
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('UtilsDemo');

/**
 * Demonstrate path utilities
 */
async function demonstratePathUtils() {
  logger.info('=== Path Utilities Demo ===');
  
  // Resolve paths
  const configPath = utils.path.resolveProjectPath('.agent-config.json');
  logger.info(`Project root: ${utils.path.PROJECT_ROOT}`);
  logger.info(`Config path: ${configPath}`);
  
  // Check if paths exist
  logger.info(`Config file exists: ${utils.path.pathExists(configPath)}`);
  
  // Create a temporary directory
  const tempDir = utils.path.resolveProjectPath('.cache', 'utils-demo');
  if (utils.path.ensureDir(tempDir)) {
    logger.info(`Created temporary directory: ${tempDir}`);
  }
  
  // Get file information
  const packageJsonPath = utils.path.resolveProjectPath('package.json');
  const statsResult = await utils.path.getStats(packageJsonPath);
  if (statsResult.success) {
    logger.info(`package.json size: ${statsResult.value.size} bytes`);
    logger.info(`package.json modified: ${statsResult.value.mtime}`);
  }
  
  // Working with paths
  const filePath = '/path/to/some/file.txt';
  logger.info(`File name: ${utils.path.getFilename(filePath)}`);
  logger.info(`File name without extension: ${utils.path.getFilename(filePath, true)}`);
  logger.info(`File extension: ${utils.path.getExtension(filePath)}`);
  logger.info(`Parent directory: ${utils.path.getParentDirectory(filePath)}`);
}

/**
 * Demonstrate file utilities
 */
async function demonstrateFileUtils() {
  logger.info('\n=== File Utilities Demo ===');
  
  // Create a temporary file
  const tempFile = utils.path.resolveProjectPath('.cache', 'utils-demo', 'test-file.txt');
  
  // Write to file
  const writeResult = await utils.file.writeFile(tempFile, 'This is a test file.\nCreated by DStudio Utils Demo.\n');
  if (writeResult.success) {
    logger.info(`Created test file: ${tempFile}`);
  } else {
    logger.error(`Failed to create test file: ${writeResult.error?.message}`);
    return;
  }
  
  // Read from file
  const readResult = await utils.file.readFile(tempFile);
  if (readResult.success) {
    logger.info(`File content: "${readResult.value.trim()}"`);
  }
  
  // Calculate checksum
  const checksumResult = await utils.file.calculateChecksum(tempFile);
  if (checksumResult.success) {
    logger.info(`File checksum: ${checksumResult.value}`);
  }
  
  // List directory
  const cacheDir = utils.path.resolveProjectPath('.cache');
  const dirResult = await utils.file.readDirectory(cacheDir);
  if (dirResult.success) {
    logger.info(`Cache directory contents: ${dirResult.value.map(entry => entry.name).join(', ')}`);
  }
  
  // Find files
  const findResult = await utils.file.findFiles(utils.path.resolveProjectPath('**/*.js'), { 
    ignore: ['**/node_modules/**'],
    cwd: utils.path.PROJECT_ROOT
  });
  if (findResult.success) {
    logger.info(`Found ${findResult.value.length} JavaScript files in the project`);
  }
  
  // Copy a file
  const copyDest = utils.path.resolveProjectPath('.cache', 'utils-demo', 'copy-test-file.txt');
  const copyResult = await utils.file.copy(tempFile, copyDest);
  if (copyResult.success) {
    logger.info(`File copied to: ${copyDest}`);
  }
}

/**
 * Demonstrate logger utilities
 */
function demonstrateLogger() {
  logger.info('\n=== Logger Demo ===');
  
  // Different log levels
  logger.error('This is an error message');
  logger.warn('This is a warning message');
  logger.info('This is an info message');
  logger.debug('This is a debug message (may not be visible with default log level)');
  
  // Create component-specific logger
  const componentLogger = utils.logger.createScopedLogger('Component');
  componentLogger.info('This message is from a component-scoped logger');
  
  // Log with formatting
  logger.info('Formatted message: {0}, {1}', 'Hello', 'World');
  
  // Set log level
  utils.logger.setLogLevel('DEBUG');
  logger.debug('Now this debug message should be visible');
}

/**
 * Demonstrate configuration utilities
 */
function demonstrateConfig() {
  logger.info('\n=== Configuration Demo ===');
  
  // Read configuration values
  const implDir = utils.config.get('workspace.implementationDir', 'default-value');
  logger.info(`Implementation directory: ${implDir}`);
  
  // Check features
  const isFeatureEnabled = utils.config.isFeatureEnabled('someFeature');
  logger.info(`Feature status: ${isFeatureEnabled ? 'enabled' : 'disabled'}`);
  
  // Get paths from config
  const implementationDir = utils.config.getImplementationDir();
  logger.info(`Full implementation directory path: ${implementationDir}`);
  
  // Check if paths are in implementation directory
  const isImpl = utils.config.isImplementationPath(implementationDir + '/some-service');
  logger.info(`Path is in implementation directory: ${isImpl}`);
  
  // Check if path is meta
  const isMeta = utils.config.isMetaPath('package.json');
  logger.info(`Path is meta: ${isMeta}`);
}

/**
 * Demonstrate error handling utilities
 */
async function demonstrateErrorHandling() {
  logger.info('\n=== Error Handling Demo ===');
  
  // Using specialized error types
  try {
    throw utils.error.ValidationError('This is a validation error');
  } catch (err) {
    logger.error(`Caught error: ${err.getDetailedMessage()}`);
  }
  
  // Using tryAsync
  const result = await utils.error.tryAsync(async () => {
    // Simulate an operation that might fail
    if (Math.random() > 0.5) {
      throw new Error('Random failure');
    }
    return 'Operation succeeded';
  }, 'Default value');
  
  if (result.success) {
    logger.info(`Try operation result: ${result.value}`);
  } else {
    logger.warn(`Try operation failed: ${result.error.message}`);
  }
  
  // Using withErrorHandling
  const safeFunction = utils.error.withErrorHandling(
    async () => {
      // This would normally crash the application
      return require('fs').readFileSync('/path/that/does/not/exist');
    }, 
    { 
      exitOnError: false, 
      rethrow: false
    }
  );
  
  await safeFunction();
  logger.info('Application continues even after file read error');
}

/**
 * Demonstrate cache utilities
 */
async function demonstrateCacheUtils() {
  logger.info('\n=== Cache Utilities Demo ===');
  
  // Get cache paths
  logger.info(`Cache directory: ${utils.cache.CACHE_DIR}`);
  
  // Create cache subdirectory
  utils.cache.ensureCacheDir('demo');
  const cachePath = utils.cache.getCachePath('test-cache.json', 'demo');
  logger.info(`Cache file path: ${cachePath}`);
  
  // Store data in cache
  const cacheData = {
    timestamp: Date.now(),
    message: 'Hello from cache'
  };
  
  if (utils.cache.setCache('test-cache.json', cacheData, 'demo')) {
    logger.info('Data stored in cache');
  }
  
  // Retrieve data from cache
  const retrievedData = utils.cache.getCache('test-cache.json', true, 'demo');
  if (retrievedData.success) {
    logger.info(`Retrieved from cache: ${JSON.stringify(retrievedData.value)}`);
  }
  
  // Check cache size
  const cacheSize = utils.cache.getCacheSize();
  logger.info(`Total cache size: ${utils.cache.formatCacheSize(cacheSize)}`);
  
  // Check cache age
  const cacheAge = utils.cache.getCacheAge('test-cache.json', 'demo');
  logger.info(`Cache age: ${cacheAge.toFixed(2)} seconds`);
}

/**
 * Demonstrate project utilities
 */
async function demonstrateProjectUtils() {
  logger.info('\n=== Project Utilities Demo ===');
  
  // Get services
  const servicesResult = utils.project.getServices();
  if (servicesResult.success) {
    logger.info(`Found ${servicesResult.value.length} services:`);
    servicesResult.value.forEach(service => {
      const language = utils.project.detectServiceLanguage(service.path);
      logger.info(`- ${service.name} (${language})`);
    });
  } else {
    logger.warn(`Failed to get services: ${servicesResult.error}`);
  }
  
  // Create a demo agent status
  const statusContent = `# Agent Status Update

This is a demo status update from the Utils Demo script.

## Current Tasks

- [x] Demo path utilities
- [x] Demo file utilities
- [x] Demo logger
- [x] Demo configuration
- [x] Demo error handling
- [x] Demo cache utilities
- [x] Demo project utilities

## Next Steps

Planning to refactor more scripts to use the new utility modules.
`;

  const statusResult = utils.project.createAgentStatus('demo-agent', statusContent);
  if (statusResult.success) {
    logger.info(`Created agent status file: ${statusResult.value}`);
    
    // Generate merged status
    const mergeResult = utils.project.generateProjectStatus();
    if (mergeResult.success) {
      logger.info('Generated merged project status');
    }
  }
}

/**
 * Main function to run all demos
 */
async function main() {
  logger.info('DStudio Utilities Demo');
  logger.info('=====================');
  
  try {
    await demonstratePathUtils();
    await demonstrateFileUtils();
    demonstrateLogger();
    demonstrateConfig();
    await demonstrateErrorHandling();
    await demonstrateCacheUtils();
    await demonstrateProjectUtils();
    
    logger.info('\nUtils demo completed successfully!');
  } catch (err) {
    logger.error(`Demo failed: ${err.message}`);
  } finally {
    // Clean up demo files
    const demoDir = utils.path.resolveProjectPath('.cache', 'utils-demo');
    if (utils.path.pathExists(demoDir)) {
      await utils.file.remove(demoDir);
      logger.info('Cleaned up demo files');
    }
  }
}

// Run the main function with error handling
utils.error.withErrorHandling(main, {
  exitOnError: true,
  logErrors: true
})();
