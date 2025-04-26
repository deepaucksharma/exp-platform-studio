/**
 * File System Utilities
 * Standardized file operations with consistent error handling and async patterns
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const glob = require('glob');
const minimatch = require('minimatch');

const { FileSystemError, tryAsync, trySync } = require('./error-utils');
const pathUtils = require('./path-utils');

/**
 * Read a file with standardized error handling
 * @param {string} filePath - Path to file
 * @param {string} encoding - File encoding (default: utf8)
 * @returns {Promise<Object>} Result object with success flag and content or error
 */
async function readFile(filePath, encoding = 'utf8') {
  return tryAsync(async () => {
    return await fs.readFile(filePath, encoding);
  });
}

/**
 * Read a file synchronously with standardized error handling
 * @param {string} filePath - Path to file
 * @param {string} encoding - File encoding (default: utf8)
 * @returns {Object} Result object with success flag and content or error
 */
function readFileSync(filePath, encoding = 'utf8') {
  return trySync(() => {
    return fsSync.readFileSync(filePath, encoding);
  });
}

/**
 * Write to a file with standardized error handling
 * @param {string} filePath - Path to file
 * @param {string|Buffer} content - File content
 * @param {Object} options - Write options
 * @returns {Promise<Object>} Result object with success flag
 */
async function writeFile(filePath, content, options = {}) {
  return tryAsync(async () => {
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fsSync.existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
    
    await fs.writeFile(filePath, content, options);
    return true;
  }, false);
}

/**
 * Write to a file synchronously with standardized error handling
 * @param {string} filePath - Path to file
 * @param {string|Buffer} content - File content
 * @param {Object} options - Write options
 * @returns {Object} Result object with success flag
 */
function writeFileSync(filePath, content, options = {}) {
  return trySync(() => {
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fsSync.existsSync(dirPath)) {
      fsSync.mkdirSync(dirPath, { recursive: true });
    }
    
    fsSync.writeFileSync(filePath, content, options);
    return true;
  }, false);
}

/**
 * Calculate file checksum
 * @param {string} filePath - Path to file
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {Promise<Object>} Result object with success flag and checksum or error
 */
async function calculateChecksum(filePath, algorithm = 'sha256') {
  return tryAsync(async () => {
    const fileHandle = await fs.open(filePath, 'r');
    const hash = crypto.createHash(algorithm);
    const buffer = Buffer.alloc(8192);
    
    let bytesRead;
    
    try {
      while ((bytesRead = await fileHandle.read(buffer, 0, buffer.length, null)).bytesRead > 0) {
        hash.update(buffer.slice(0, bytesRead.bytesRead));
      }
    } finally {
      await fileHandle.close();
    }
    
    return hash.digest('hex');
  });
}

/**
 * Calculate file checksum synchronously
 * @param {string} filePath - Path to file
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {Object} Result object with success flag and checksum or error
 */
function calculateChecksumSync(filePath, algorithm = 'sha256') {
  return trySync(() => {
    const hash = crypto.createHash(algorithm);
    const content = fsSync.readFileSync(filePath);
    hash.update(content);
    return hash.digest('hex');
  });
}

/**
 * Get directory entries with standardized error handling
 * @param {string} dirPath - Path to directory
 * @param {Object} options - Options for readdir
 * @returns {Promise<Object>} Result object with success flag and entries or error
 */
async function readDirectory(dirPath, options = { withFileTypes: true }) {
  return tryAsync(async () => {
    return await fs.readdir(dirPath, options);
  }, []);
}

/**
 * Get directory entries synchronously with standardized error handling
 * @param {string} dirPath - Path to directory
 * @param {Object} options - Options for readdir
 * @returns {Object} Result object with success flag and entries or error
 */
function readDirectorySync(dirPath, options = { withFileTypes: true }) {
  return trySync(() => {
    return fsSync.readdirSync(dirPath, options);
  }, []);
}

/**
 * Find files matching a pattern
 * @param {string} pattern - Glob pattern
 * @param {Object} options - Glob options
 * @returns {Promise<string[]>} Array of matching file paths
 */
async function findFiles(pattern, options = {}) {
  const globPromise = promisify(glob.glob);
  return tryAsync(async () => {
    return await globPromise(pattern, options);
  }, []);
}

/**
 * Check if a file matches a pattern
 * @param {string} filePath - Path to file
 * @param {string|string[]} patterns - Pattern(s) to match against
 * @returns {boolean} True if file matches any pattern
 */
function matchesPattern(filePath, patterns) {
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
  
  return patternsArray.some(pattern => 
    minimatch(filePath, pattern, { matchBase: true })
  );
}

/**
 * Walk a directory recursively
 * @param {string} dirPath - Directory to walk
 * @param {Function} callback - Callback for each file/directory
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
async function walkDirectory(dirPath, callback, options = { skipHidden: true, maxDepth: Infinity }) {
  async function walk(currentPath, depth = 0) {
    if (depth > options.maxDepth) return;
    
    const dirResult = await readDirectory(currentPath);
    if (!dirResult.success) return;
    
    for (const entry of dirResult.value) {
      const entryPath = path.join(currentPath, entry.name);
      
      // Skip hidden files/directories if specified
      if (options.skipHidden && entry.name.startsWith('.')) continue;
      
      // Call the callback with entry info
      await callback({
        path: entryPath,
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        depth
      });
      
      // Recursively process directories
      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1);
      }
    }
  }
  
  await walk(dirPath);
}

/**
 * Copy a file or directory
 * @param {string} source - Source path
 * @param {string} destination - Destination path
 * @param {Object} options - Copy options
 * @returns {Promise<Object>} Result object with success flag
 */
async function copy(source, destination, options = { recursive: true, overwrite: true }) {
  return tryAsync(async () => {
    // Ensure the destination directory exists
    const destDir = path.dirname(destination);
    if (!fsSync.existsSync(destDir)) {
      await fs.mkdir(destDir, { recursive: true });
    }
    
    // Check if source is a directory or file
    const stats = await fs.stat(source);
    
    if (stats.isDirectory()) {
      // If recursive copy is disabled for directories, just create the destination directory
      if (!options.recursive) {
        await fs.mkdir(destination, { recursive: true });
        return true;
      }
      
      // Copy directory recursively
      if (!fsSync.existsSync(destination)) {
        await fs.mkdir(destination, { recursive: true });
      }
      
      const entries = await fs.readdir(source, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);
        
        if (entry.isDirectory()) {
          await copy(srcPath, destPath, options);
        } else {
          await copy(srcPath, destPath, options);
        }
      }
    } else {
      // Copy file
      if (fsSync.existsSync(destination) && !options.overwrite) {
        return false;
      }
      
      await fs.copyFile(source, destination);
    }
    
    return true;
  }, false);
}

/**
 * Remove a file or directory
 * @param {string} filePath - Path to remove
 * @param {Object} options - Remove options
 * @returns {Promise<Object>} Result object with success flag
 */
async function remove(filePath, options = { recursive: true, force: true }) {
  return tryAsync(async () => {
    if (!fsSync.existsSync(filePath)) {
      return true;
    }
    
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: options.recursive, force: options.force });
    } else {
      await fs.unlink(filePath);
    }
    
    return true;
  }, false);
}

/**
 * Calculate the size of a file or directory
 * @param {string} filePath - Path to calculate size for
 * @returns {Promise<Object>} Result object with success flag and size in bytes
 */
async function calculateSize(filePath) {
  return tryAsync(async () => {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      let size = 0;
      
      await walkDirectory(filePath, async (entry) => {
        if (entry.isFile) {
          const fileStats = await fs.stat(entry.path);
          size += fileStats.size;
        }
      });
      
      return size;
    } else {
      return stats.size;
    }
  }, 0);
}

/**
 * Get modification time of a file
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} Result object with success flag and mtime
 */
async function getModificationTime(filePath) {
  return tryAsync(async () => {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  });
}

/**
 * Get modification time of a file synchronously
 * @param {string} filePath - Path to file
 * @returns {Object} Result object with success flag and mtime
 */
function getModificationTimeSync(filePath) {
  return trySync(() => {
    const stats = fsSync.statSync(filePath);
    return stats.mtime;
  });
}

module.exports = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync,
  calculateChecksum,
  calculateChecksumSync,
  readDirectory,
  readDirectorySync,
  findFiles,
  matchesPattern,
  walkDirectory,
  copy,
  remove,
  calculateSize,
  getModificationTime,
  getModificationTimeSync
};
