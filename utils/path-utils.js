/**
 * Path Utilities
 * Standardized path handling across the application
 */

const path = require('path');
const fs = require('fs');
const { ConfigError, FileSystemError, trySync } = require('./error-utils');

// Project root directory (2 levels up from utils/path-utils.js)
const PROJECT_ROOT = path.resolve(path.join(__dirname, '..'));

/**
 * Resolve a path relative to the project root
 * @param {...string} segments - Path segments to join
 * @returns {string} Absolute path
 */
function resolveProjectPath(...segments) {
  return path.resolve(path.join(PROJECT_ROOT, ...segments));
}

/**
 * Check if a path exists
 * @param {string} filepath - Path to check
 * @returns {boolean} True if path exists
 */
function pathExists(filepath) {
  return fs.existsSync(filepath);
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 * @param {Object} options - Options for directory creation
 * @returns {boolean} True if successful
 */
function ensureDir(dirPath, options = { recursive: true }) {
  const result = trySync(() => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, options);
      return true;
    }
    return true;
  }, false);
  
  return result.success;
}

/**
 * Get stats for a file or directory
 * @param {string} filepath - Path to check
 * @returns {Object} Result with success flag and stats or error
 */
function getStats(filepath) {
  return trySync(() => fs.statSync(filepath));
}

/**
 * Check if path is a directory
 * @param {string} dirPath - Path to check
 * @returns {boolean} True if path is a directory
 */
function isDirectory(dirPath) {
  const stats = getStats(dirPath);
  return stats.success && stats.value.isDirectory();
}

/**
 * Check if path is a file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is a file
 */
function isFile(filePath) {
  const stats = getStats(filePath);
  return stats.success && stats.value.isFile();
}

/**
 * Get the relative path from the project root
 * @param {string} fullPath - Full path
 * @returns {string} Relative path
 */
function getRelativeToProjectRoot(fullPath) {
  return path.relative(PROJECT_ROOT, fullPath);
}

/**
 * Get the filename from a path
 * @param {string} filePath - File path
 * @param {boolean} removeExtension - Whether to remove the extension
 * @returns {string} Filename
 */
function getFilename(filePath, removeExtension = false) {
  const basename = path.basename(filePath);
  return removeExtension ? basename.replace(/\.[^/.]+$/, '') : basename;
}

/**
 * Get the file extension from a path
 * @param {string} filePath - File path
 * @returns {string} File extension (with dot)
 */
function getExtension(filePath) {
  return path.extname(filePath);
}

/**
 * Check if a path is within another directory
 * @param {string} filepath - Path to check
 * @param {string} directory - Directory to check against
 * @returns {boolean} True if path is within directory
 */
function isWithinDirectory(filepath, directory) {
  const resolvedFilepath = path.resolve(filepath);
  const resolvedDirectory = path.resolve(directory);
  
  return resolvedFilepath.startsWith(resolvedDirectory);
}

/**
 * Get the parent directory of a path
 * @param {string} filepath - Path
 * @returns {string} Parent directory
 */
function getParentDirectory(filepath) {
  return path.dirname(filepath);
}

/**
 * Join path segments with appropriate separators
 * @param {...string} segments - Path segments
 * @returns {string} Joined path
 */
function joinPath(...segments) {
  return path.join(...segments);
}

module.exports = {
  PROJECT_ROOT,
  resolveProjectPath,
  pathExists,
  ensureDir,
  getStats,
  isDirectory,
  isFile,
  getRelativeToProjectRoot,
  getFilename,
  getExtension,
  isWithinDirectory,
  getParentDirectory,
  joinPath
};
