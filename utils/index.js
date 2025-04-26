/**
 * DStudio Unified Utilities
 * Centralizes common functionality used across scripts
 */

// Export all utility modules
module.exports = {
  // Core utilities
  config: require('./config-utils'),
  file: require('./file-utils'),
  path: require('./path-utils'),
  error: require('./error-utils'),
  logger: require('./logger'),
  
  // Domain-specific utilities
  cache: require('./cache-utils'),
  project: require('./project-utils')
};
