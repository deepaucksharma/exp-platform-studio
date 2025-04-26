#!/usr/bin/env node

/**
 * Cache Cleanup Utility
 * Manages the .cache directory, removing stale files and ensuring it doesn't grow unbounded
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('CacheCleanup');

/**
 * Main function
 */
function main() {
  logger.info('DStudio Cache Cleanup');
  logger.info('====================');
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const forceMode = args.includes('--force');
  const cleanAll = args.includes('--all');
  
  logger.info(`Mode: ${forceMode ? 'Force cleanup' : 'Standard cleanup'}${cleanAll ? ', cleaning all artifacts' : ''}`);
  
  // Ensure cache directories exist
  utils.cache.ensureCacheDir();
  utils.cache.ensureCacheDir('stale-locks');
  utils.cache.ensureCacheDir('diff-logs');
  utils.cache.ensureCacheDir('temp');
  
  // Clean up stale lock files
  const lockFilesRemoved = utils.cache.cleanupStaleCache('stale-locks');
  logger.info(`Cleaned up ${lockFilesRemoved} stale lock files`);
  
  // Clean up diff logs
  const diffLogsRemoved = utils.cache.cleanupStaleCache('diff-logs');
  logger.info(`Cleaned up ${diffLogsRemoved} diff log files`);
  
  // Clean up temp files (with shorter max age)
  const tempFilesRemoved = utils.cache.cleanupStaleCache('temp', 24 * 60 * 60); // 1 day
  logger.info(`Cleaned up ${tempFilesRemoved} temporary files older than 1 day`);
  
  // Clean up build artifacts
  const artifactResult = utils.cache.cleanupBuildArtifacts();
  if (artifactResult.success) {
    logger.info(`Cleaned up ${artifactResult.totalRemoved} build artifact directories (${utils.cache.formatCacheSize(artifactResult.totalSize)} total)`);
    
    if (artifactResult.errors) {
      artifactResult.errors.forEach(error => logger.warn(error));
    }
  } else if (artifactResult.error) {
    logger.warn(`Build artifact cleanup issue: ${artifactResult.error}`);
  }
  
  // Check cache size
  const cacheSize = utils.cache.getCacheSize();
  logger.info(`Total cache size: ${utils.cache.formatCacheSize(cacheSize)}`);
  
  logger.info('\nCache cleanup complete!');
}

// Run the main function with error handling
try {
  main();
} catch (err) {
  utils.error.createErrorHandler('cache-cleanup')(err);
}
