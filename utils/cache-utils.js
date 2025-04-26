/**
 * Cache Utilities
 * Standardized cache management across scripts
 */

const fs = require('fs');
const path = require('path');
const { tryAsync, trySync, FileSystemError } = require('./error-utils');
const fileUtils = require('./file-utils');
const configUtils = require('./config-utils');
const pathUtils = require('./path-utils');

// Cache directory path
const CACHE_DIR = pathUtils.resolveProjectPath('.cache');

/**
 * Ensure cache directory and subdirectories exist
 * @param {string} subdir - Subdirectory to ensure exists (optional)
 * @returns {boolean} True if successful
 */
function ensureCacheDir(subdir = '') {
  const dirPath = subdir ? path.join(CACHE_DIR, subdir) : CACHE_DIR;
  
  return pathUtils.ensureDir(dirPath);
}

/**
 * Get a file path in the cache directory
 * @param {string} filename - Filename in cache
 * @param {string} subdir - Subdirectory (optional)
 * @returns {string} Full path to cache file
 */
function getCachePath(filename, subdir = '') {
  ensureCacheDir(subdir);
  return path.join(CACHE_DIR, subdir, filename);
}

/**
 * Store data in the cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {string} subdir - Subdirectory (optional)
 * @returns {boolean} True if successful
 */
function setCache(key, data, subdir = '') {
  const cachePath = getCachePath(key, subdir);
  
  const result = trySync(() => {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    fs.writeFileSync(cachePath, content, 'utf8');
    return true;
  }, false);
  
  return result.success;
}

/**
 * Retrieve data from the cache
 * @param {string} key - Cache key
 * @param {boolean} parseJson - Whether to parse JSON (default: true)
 * @param {string} subdir - Subdirectory (optional)
 * @returns {Object} Result with data or null if not found
 */
function getCache(key, parseJson = true, subdir = '') {
  const cachePath = getCachePath(key, subdir);
  
  if (!fs.existsSync(cachePath)) {
    return { success: false, value: null };
  }
  
  const result = trySync(() => {
    const content = fs.readFileSync(cachePath, 'utf8');
    return parseJson ? JSON.parse(content) : content;
  });
  
  return result;
}

/**
 * Remove an item from the cache
 * @param {string} key - Cache key
 * @param {string} subdir - Subdirectory (optional)
 * @returns {boolean} True if successful
 */
function removeCache(key, subdir = '') {
  const cachePath = getCachePath(key, subdir);
  
  if (!fs.existsSync(cachePath)) {
    return true;
  }
  
  const result = trySync(() => {
    fs.unlinkSync(cachePath);
    return true;
  }, false);
  
  return result.success;
}

/**
 * Check if a cache item exists
 * @param {string} key - Cache key
 * @param {string} subdir - Subdirectory (optional)
 * @returns {boolean} True if cache item exists
 */
function cacheExists(key, subdir = '') {
  const cachePath = getCachePath(key, subdir);
  return fs.existsSync(cachePath);
}

/**
 * Get the age of a cache item in seconds
 * @param {string} key - Cache key
 * @param {string} subdir - Subdirectory (optional)
 * @returns {number} Age in seconds or -1 if not found
 */
function getCacheAge(key, subdir = '') {
  const cachePath = getCachePath(key, subdir);
  
  if (!fs.existsSync(cachePath)) {
    return -1;
  }
  
  const result = trySync(() => {
    const stats = fs.statSync(cachePath);
    return (Date.now() - stats.mtimeMs) / 1000;
  }, -1);
  
  return result.value;
}

/**
 * Check if a cache item is stale
 * @param {string} key - Cache key
 * @param {number} maxAge - Maximum age in seconds
 * @param {string} subdir - Subdirectory (optional)
 * @returns {boolean} True if cache is stale or doesn't exist
 */
function isCacheStale(key, maxAge, subdir = '') {
  const age = getCacheAge(key, subdir);
  return age === -1 || age > maxAge;
}

/**
 * Clean up stale cache files
 * @param {string} subdir - Subdirectory to clean (optional)
 * @param {number} maxAge - Maximum age in seconds (default: 7 days)
 * @returns {number} Number of files removed
 */
function cleanupStaleCache(subdir = '', maxAge = 7 * 24 * 60 * 60) {
  const dirPath = subdir ? path.join(CACHE_DIR, subdir) : CACHE_DIR;
  
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  let removed = 0;
  
  const result = trySync(() => {
    const now = Date.now();
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      // Skip directories unless recursive cleanup is needed
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      const stats = fs.statSync(filePath);
      const ageInSeconds = (now - stats.mtimeMs) / 1000;
      
      if (ageInSeconds > maxAge) {
        fs.unlinkSync(filePath);
        removed++;
      }
    }
    
    return removed;
  }, 0);
  
  return result.value;
}

/**
 * Calculate the total size of the cache
 * @param {string} subdir - Subdirectory to measure (optional)
 * @returns {number} Size in bytes
 */
function getCacheSize(subdir = '') {
  const dirPath = subdir ? path.join(CACHE_DIR, subdir) : CACHE_DIR;
  
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  let size = 0;
  
  const result = trySync(() => {
    function getDirectorySize(dirPath) {
      let dirSize = 0;
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stats = fs.statSync(entryPath);
        
        if (stats.isDirectory()) {
          dirSize += getDirectorySize(entryPath);
        } else {
          dirSize += stats.size;
        }
      }
      
      return dirSize;
    }
    
    return getDirectorySize(dirPath);
  }, 0);
  
  return result.value;
}

/**
 * Format cache size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatCacheSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Clean up build artifacts
 * @param {number} maxAge - Maximum age in seconds (default: 7 days)
 * @returns {Object} Object with info about cleanup
 */
function cleanupBuildArtifacts(maxAge = 7 * 24 * 60 * 60) {
  const implDir = configUtils.getImplementationDir();
  
  // Directories to look for
  const artifactDirs = [
    // Rust build artifacts
    { pattern: 'target', maxAge },
    // Go build artifacts
    { pattern: 'bin', maxAge },
    { pattern: 'pkg', maxAge },
    // Cache dirs
    { pattern: '__pycache__', maxAge },
    { pattern: '.pytest_cache', maxAge }
  ];
  
  if (!fs.existsSync(implDir)) {
    return { 
      success: false, 
      totalRemoved: 0, 
      totalSize: 0, 
      error: 'Implementation directory does not exist' 
    };
  }
  
  let totalSize = 0;
  let totalRemoved = 0;
  const errors = [];
  
  const result = trySync(() => {
    for (const artifactDir of artifactDirs) {
      const dirsFound = findArtifactDirs(implDir, artifactDir.pattern);
      
      for (const dir of dirsFound) {
        try {
          const stats = fs.statSync(dir);
          const ageInSeconds = (Date.now() - stats.mtimeMs) / 1000;
          
          if (ageInSeconds > artifactDir.maxAge) {
            // Get directory size before removal
            const dirSize = getDirSize(dir);
            totalSize += dirSize;
            
            // Remove the directory recursively
            fs.rmSync(dir, { recursive: true, force: true });
            totalRemoved++;
          }
        } catch (err) {
          errors.push(`Error processing directory ${dir}: ${err.message}`);
        }
      }
    }
    
    return {
      success: true,
      totalRemoved,
      totalSize,
      errors: errors.length > 0 ? errors : null
    };
  }, { 
    success: false, 
    totalRemoved: 0, 
    totalSize: 0, 
    errors: ['Unknown error during artifact cleanup'] 
  });
  
  return result.value;
}

/**
 * Find artifact directories recursively
 * @param {string} startDir - Directory to start search
 * @param {string} pattern - Pattern to match
 * @returns {string[]} Array of matching directories
 */
function findArtifactDirs(startDir, pattern) {
  const results = [];
  
  function traverseDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip excluded directories
        if (configUtils.isExcludedDir(entry.name)) {
          continue;
        }
        
        if (entry.name === pattern) {
          results.push(fullPath);
        } else {
          traverseDir(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  traverseDir(startDir);
  return results;
}

/**
 * Get directory size recursively
 * @param {string} dirPath - Directory path
 * @returns {number} Size in bytes
 */
function getDirSize(dirPath) {
  let size = 0;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isFile()) {
        try {
          const stats = fs.statSync(entryPath);
          size += stats.size;
        } catch (err) {
          // Skip files we can't stat
        }
      } else if (entry.isDirectory()) {
        size += getDirSize(entryPath);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  
  return size;
}

module.exports = {
  CACHE_DIR,
  ensureCacheDir,
  getCachePath,
  setCache,
  getCache,
  removeCache,
  cacheExists,
  getCacheAge,
  isCacheStale,
  cleanupStaleCache,
  getCacheSize,
  formatCacheSize,
  cleanupBuildArtifacts
};
