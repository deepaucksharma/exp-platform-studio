#!/usr/bin/env node

/**
 * Cache Cleanup Utility
 * Manages the .cache directory, removing stale files and ensuring it doesn't grow unbounded
 */

const fs = require('fs');
const path = require('path');
const utils = require('./config-utils');

// Default max age for cache files (7 days in seconds)
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

// Get max cache age from config or use default
const maxCacheAge = (utils.config.recovery && utils.config.recovery.maxCacheAge) || DEFAULT_MAX_AGE;

// Cache directory
const CACHE_DIR = path.resolve(path.join(__dirname, '..', '.cache'));

/**
 * Clean up stale locks directory
 */
function cleanupStaleLocks() {
  const staleLocksDir = utils.getStaleLocksDir();
  
  if (!fs.existsSync(staleLocksDir)) {
    console.log(`Stale locks directory doesn't exist: ${staleLocksDir}`);
    return;
  }
  
  try {
    const now = Date.now();
    const locks = fs.readdirSync(staleLocksDir);
    let removed = 0;
    
    for (const lock of locks) {
      const lockPath = path.join(staleLocksDir, lock);
      const stats = fs.statSync(lockPath);
      
      // Check if file is older than max age
      const ageInSeconds = (now - stats.mtimeMs) / 1000;
      
      if (ageInSeconds > maxCacheAge) {
        fs.unlinkSync(lockPath);
        removed++;
      }
    }
    
    console.log(`Cleaned up ${removed} stale lock files older than ${maxCacheAge} seconds`);
  } catch (err) {
    console.error(`Error cleaning up stale locks: ${err.message}`);
  }
}

/**
 * Clean up diff logs
 */
function cleanupDiffLogs() {
  const diffLogsDir = path.join(CACHE_DIR, 'diff-logs');
  
  if (!fs.existsSync(diffLogsDir)) {
    console.log(`Diff logs directory doesn't exist: ${diffLogsDir}`);
    return;
  }
  
  try {
    const now = Date.now();
    const logs = fs.readdirSync(diffLogsDir);
    let removed = 0;
    
    for (const log of logs) {
      const logPath = path.join(diffLogsDir, log);
      const stats = fs.statSync(logPath);
      
      // Check if file is older than max age
      const ageInSeconds = (now - stats.mtimeMs) / 1000;
      
      if (ageInSeconds > maxCacheAge) {
        fs.unlinkSync(logPath);
        removed++;
      }
    }
    
    console.log(`Cleaned up ${removed} diff log files older than ${maxCacheAge} seconds`);
  } catch (err) {
    console.error(`Error cleaning up diff logs: ${err.message}`);
  }
}

/**
 * Clean up any temp files
 */
function cleanupTempFiles() {
  const tempDir = path.join(CACHE_DIR, 'temp');
  
  if (!fs.existsSync(tempDir)) {
    return;
  }
  
  try {
    const now = Date.now();
    const tempFiles = fs.readdirSync(tempDir);
    let removed = 0;
    
    for (const file of tempFiles) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      // Check if file is older than 1 day
      const ageInSeconds = (now - stats.mtimeMs) / 1000;
      
      if (ageInSeconds > 24 * 60 * 60) { // 1 day
        fs.unlinkSync(filePath);
        removed++;
      }
    }
    
    console.log(`Cleaned up ${removed} temporary files older than 1 day`);
  } catch (err) {
    console.error(`Error cleaning up temp files: ${err.message}`);
  }
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Created cache directory: ${CACHE_DIR}`);
  }
  
  // Ensure stale locks directory exists
  const staleLocksDir = utils.getStaleLocksDir();
  if (!fs.existsSync(staleLocksDir)) {
    fs.mkdirSync(staleLocksDir, { recursive: true });
    console.log(`Created stale locks directory: ${staleLocksDir}`);
  }
  
  // Ensure diff logs directory exists
  const diffLogsDir = path.join(CACHE_DIR, 'diff-logs');
  if (!fs.existsSync(diffLogsDir)) {
    fs.mkdirSync(diffLogsDir, { recursive: true });
    console.log(`Created diff logs directory: ${diffLogsDir}`);
  }
  
  // Ensure temp directory exists
  const tempDir = path.join(CACHE_DIR, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temp directory: ${tempDir}`);
  }
}

/**
 * Check total cache size
 */
function checkCacheSize() {
  if (!fs.existsSync(CACHE_DIR)) {
    return 0;
  }
  
  let totalSize = 0;
  
  function getDirectorySize(dirPath) {
    let size = 0;
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }
    
    return size;
  }
  
  try {
    totalSize = getDirectorySize(CACHE_DIR);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`Total cache size: ${totalSizeMB} MB`);
  } catch (err) {
    console.error(`Error checking cache size: ${err.message}`);
  }
  
  return totalSize;
}

/**
 * Main function
 */
function main() {
  console.log('DStudio Cache Cleanup');
  console.log('====================');
  
  // Ensure cache directories exist
  ensureCacheDir();
  
  // Clean up stale lock files
  cleanupStaleLocks();
  
  // Clean up diff logs
  cleanupDiffLogs();
  
  // Clean up temp files
  cleanupTempFiles();
  
  // Check cache size
  const cacheSize = checkCacheSize();
  
  console.log('\nCache cleanup complete!');
}

// Run the main function
main();
