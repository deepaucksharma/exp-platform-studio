/**
 * Configuration and Path Utilities for DStudio
 * Provides consistent path handling and configuration access across all scripts
 */

const fs = require('fs');
const path = require('path');

// Load configuration
let config;
try {
  const configPath = path.resolve(__dirname, '..', '.agent-config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('Failed to load .agent-config.json:', err.message);
  process.exit(1);
}

/**
 * Get absolute path from a relative project path
 * @param {string} relativePath - Path relative to project root
 * @returns {string} Absolute path
 */
function getAbsolutePath(relativePath) {
  return path.resolve(
    path.join(
      __dirname, 
      '..', 
      relativePath.replace(/^[.\/\\]+/, '')
    )
  );
}

/**
 * Get the absolute implementation directory path
 * @returns {string} Absolute implementation directory path
 */
function getImplementationDir() {
  const implDir = config.workspace.implementationDir || './generated_implementation';
  return getAbsolutePath(implDir);
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
  const metaFiles = config.workspace.metaFiles || [
    '.agent-config.json',
    'project-layout.json',
    'project-status.md',
    'spec.index.json',
    'status.quick.json'
  ];
  
  return metaFiles.includes(basename) || 
         basename.startsWith('.') || 
         basename === 'scripts' || 
         basename === 'docs';
}

/**
 * Get the project language based on file existence
 * @returns {string} Detected language or 'unknown'
 */
function detectProjectLanguage() {
  const patterns = config.workspace.projectTypePatterns || {};
  
  for (const [language, filePatterns] of Object.entries(patterns)) {
    for (const pattern of filePatterns) {
      const fullPath = getAbsolutePath(pattern);
      if (fs.existsSync(fullPath)) {
        return language;
      }
    }
  }
  
  return 'unknown';
}

/**
 * Check if required dependencies are installed
 * @returns {Object} Object with status and missing dependencies
 */
function checkDependencies() {
  const requiredDeps = 
    (config.development && config.development.scripts && 
     config.development.scripts.requiredDependencies) || {};
  
  const missing = [];
  
  // We can't easily check all dependencies, but we can check node/npm versions
  if (requiredDeps.node) {
    const nodeVersion = process.version;
    const requiredVersion = requiredDeps.node;
    
    // Simple version check (doesn't handle all semver cases)
    if (requiredVersion.startsWith('>=')) {
      const minVersion = requiredVersion.substring(2);
      const current = nodeVersion.substring(1); // Remove 'v' prefix
      
      if (current < minVersion) {
        missing.push(`Node.js ${nodeVersion} (required: ${requiredVersion})`);
      }
    }
  }
  
  return {
    success: missing.length === 0,
    missing
  };
}

/**
 * Check if a directory is in the excluded list
 * @param {string} dirPath - Directory path to check
 * @returns {boolean} True if directory should be excluded
 */
function isExcludedDir(dirPath) {
  const excludeDirs = config.workspace.excludeDirs || [];
  const basename = path.basename(dirPath);
  
  return excludeDirs.some(pattern => {
    if (pattern.includes('*')) {
      // Use simple glob-like matching
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(basename);
    }
    return basename === pattern;
  });
}

/**
 * Get the default branch name
 * @returns {string} Default branch name
 */
function getDefaultBranch() {
  return (config.development && config.development.defaultBranch) || 'main';
}

/**
 * Get the stale locks directory
 * @returns {string} Absolute path to stale locks directory
 */
function getStaleLocksDir() {
  const dir = (config.recovery && config.recovery.staleLocksDir) || '.cache/stale-locks';
  return getAbsolutePath(dir);
}

module.exports = {
  config,
  getAbsolutePath,
  getImplementationDir,
  isImplementationPath,
  isMetaPath,
  detectProjectLanguage,
  checkDependencies,
  isExcludedDir,
  getDefaultBranch,
  getStaleLocksDir
};
