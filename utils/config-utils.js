/**
 * Configuration Utilities
 * Standardized configuration access and manipulation
 */

const fs = require('fs');
const path = require('path');
const { ConfigError, trySync, tryAsync } = require('./error-utils');

// Configuration paths
const PROJECT_ROOT = path.resolve(path.join(__dirname, '..'));
const CONFIG_FILE_PATH = path.join(PROJECT_ROOT, '.agent-config.json');
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, '.agent-config.default.json');

// Load configuration with fallback to default
let config;
try {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
  } else if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
  } else {
    // Basic default configuration if no file exists
    config = {
      workspace: {
        implementationDir: './generated_implementation',
        metaFiles: [
          '.agent-config.json',
          'project-layout.json',
          'project-status.md',
          'spec.index.json',
          'status.quick.json'
        ],
        excludeDirs: [
          'node_modules',
          '.git',
          '.cache',
          'dist',
          'build'
        ]
      },
      development: {
        defaultBranch: 'main',
        scripts: {
          requiredDependencies: {
            node: '>=16.0.0'
          }
        }
      },
      recovery: {
        heartbeatStaleSeconds: 300,
        heartbeatIntervalSeconds: 30,
        staleLocksDir: '.cache/stale-locks',
        maxCacheAge: 7 * 24 * 60 * 60 // 7 days in seconds
      }
    };
  }
} catch (err) {
  throw new ConfigError(`Failed to load configuration: ${err.message}`, err);
}

/**
 * Get a configuration value by path
 * @param {string} configPath - Dot-notation path to configuration value
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Configuration value or default
 */
function get(configPath, defaultValue = undefined) {
  const parts = configPath.split('.');
  let current = config;
  
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Set a configuration value by path
 * @param {string} configPath - Dot-notation path to configuration value
 * @param {any} value - Value to set
 * @returns {boolean} True if successful
 */
function set(configPath, value) {
  const parts = configPath.split('.');
  const lastPart = parts.pop();
  let current = config;
  
  // Navigate to the right nesting level
  for (const part of parts) {
    if (current[part] === undefined) {
      current[part] = {};
    } else if (typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  // Set the value
  current[lastPart] = value;
  
  // Save the configuration
  return saveConfig();
}

/**
 * Save the configuration to file
 * @returns {boolean} True if successful
 */
function saveConfig() {
  const result = trySync(() => {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  }, false);
  
  return result.success;
}

/**
 * Reload the configuration from file
 * @returns {boolean} True if successful
 */
function reloadConfig() {
  const result = trySync(() => {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
    return true;
  }, false);
  
  return result.success;
}

/**
 * Check if a feature is enabled in the configuration
 * @param {string} featurePath - Dot-notation path to feature
 * @returns {boolean} True if feature is enabled
 */
function isFeatureEnabled(featurePath) {
  return get(`features.${featurePath}`, false) === true;
}

/**
 * Get the implementation directory path
 * @returns {string} Implementation directory path
 */
function getImplementationDir() {
  return path.resolve(path.join(PROJECT_ROOT, get('workspace.implementationDir', 'generated_implementation')));
}

/**
 * Check if a path is within the implementation directory
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is within implementation directory
 */
function isImplementationPath(filePath) {
  const absPath = path.resolve(filePath);
  const implDir = getImplementationDir();
  return absPath.startsWith(implDir);
}

/**
 * Check if a path is a meta file or directory
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is a meta file or directory
 */
function isMetaPath(filePath) {
  const basename = path.basename(filePath);
  const metaFiles = get('workspace.metaFiles', [
    '.agent-config.json',
    'project-layout.json',
    'project-status.md',
    'spec.index.json',
    'status.quick.json'
  ]);
  
  return metaFiles.includes(basename) || 
         basename.startsWith('.') || 
         basename === 'scripts' || 
         basename === 'docs' ||
         basename === 'utils';
}

/**
 * Get the default branch name
 * @returns {string} Default branch name
 */
function getDefaultBranch() {
  return get('development.defaultBranch', 'main');
}

/**
 * Get the stale locks directory
 * @returns {string} Stale locks directory path
 */
function getStaleLocksDir() {
  return path.resolve(path.join(PROJECT_ROOT, get('recovery.staleLocksDir', '.cache/stale-locks')));
}

/**
 * Check if a directory is in the excluded list
 * @param {string} dirName - Directory name to check
 * @returns {boolean} True if directory should be excluded
 */
function isExcludedDir(dirName) {
  const excludeDirs = get('workspace.excludeDirs', [
    'node_modules',
    '.git',
    '.cache',
    'dist',
    'build'
  ]);
  
  return excludeDirs.some(pattern => {
    if (pattern.includes('*')) {
      // Use simple glob-like matching
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(dirName);
    }
    return dirName === pattern;
  });
}

module.exports = {
  config,
  get,
  set,
  saveConfig,
  reloadConfig,
  isFeatureEnabled,
  getImplementationDir,
  isImplementationPath,
  isMetaPath,
  getDefaultBranch,
  getStaleLocksDir,
  isExcludedDir
};
