#!/usr/bin/env node

/**
 * Project Layout Generator
 * Creates a map of the project structure with SHA-256 checksums
 * Focuses specifically on the implementation directory
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const utils = require('./config-utils');

// Helper to calculate SHA-256 of a file
function getFileHash(filePath) {
  try {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => {
         console.error(`Error hashing file ${filePath}:`, err.message);
         resolve('error-calculating-hash');
      });
    });
  } catch (err) {
    console.error(`Error initiating hash for file ${filePath}:`, err.message);
    return Promise.resolve('error-calculating-hash');
  }
}

// Simple pattern matching without minimatch dependency
function matchesPattern(filename, pattern) {
  if (pattern === filename) return true;
  if (pattern.startsWith('*') && filename.endsWith(pattern.slice(1))) return true;
  if (pattern.endsWith('*') && filename.startsWith(pattern.slice(0, -1))) return true;
  return false;
}

// Recursively scan directories
async function scanDirectory(dirPath, baseDir = '') {
  const result = { directories: {}, files: {} };

  try {
    const items = await fs.promises.readdir(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const relativePath = path.join(baseDir, item);

      // Skip excluded directories
      if (utils.isExcludedDir(item)) {
        continue;
      }

      try {
        const stats = await fs.promises.stat(itemPath);

        if (stats.isDirectory()) {
          result.directories[item] = await scanDirectory(itemPath, relativePath);
        } else if (stats.size <= 50 * 1024 * 1024) { // Limit to 50MB files
          result.files[item] = {
            size: stats.size,
            modified: stats.mtime.toISOString(),
            hash: await getFileHash(itemPath)
          };
        } else {
          result.files[item] = {
            size: stats.size,
            modified: stats.mtime.toISOString(),
            hash: 'skipped-large-file',
            note: 'File exceeds 50MB size limit for hashing'
          };
        }
      } catch (statErr) {
        console.error(`Error stating path ${itemPath}:`, statErr.message);
        if (statErr.code === 'ENOENT') continue;
        result.files[item] = { 
          size: 0, 
          modified: new Date(0).toISOString(), 
          hash: 'error-stating-file',
          error: statErr.message
        };
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err.message);
  }

  return result;
}

// Main function
async function generateProjectLayout() {
  // Check dependencies
  const depCheck = utils.checkDependencies();
  if (!depCheck.success) {
    console.warn(`Warning: Missing dependencies: ${depCheck.missing.join(', ')}`);
  }
  
  // Use the implementation directory from config
  const implDir = utils.getImplementationDir();
  const implDirRelative = utils.config.workspace.implementationDir || './generated_implementation';
  
  // Ensure implementation directory exists
  if (!fs.existsSync(implDir)) {
    try {
      await fs.promises.mkdir(implDir, { recursive: true });
      console.log(`Created implementation directory: ${implDirRelative}`);
    } catch (err) {
      console.error(`Error creating implementation directory: ${err.message}`);
    }
  }

  console.log(`Scanning implementation directory: ${implDirRelative}`);
  
  const layout = {
    version: '1.2',
    generated: new Date().toISOString(),
    rootDirectory: implDirRelative,
    structure: await scanDirectory(implDir),
    stats: {
      totalDirectories: 0,
      totalFiles: 0,
      totalSize: 0
    }
  };

  function countStats(struct) {
    let dirs = 0, files = 0, size = 0;
    dirs += Object.keys(struct.directories).length;
    files += Object.keys(struct.files).length;
    for (const file of Object.values(struct.files)) size += file.size;
    for (const dir of Object.values(struct.directories)) {
      const subStats = countStats(dir);
      dirs += subStats.dirs;
      files += subStats.files;
      size += subStats.size;
    }
    return { dirs, files, size };
  }

  const stats = countStats(layout.structure);
  layout.stats.totalDirectories = stats.dirs;
  layout.stats.totalFiles = stats.files;
  layout.stats.totalSize = stats.size;

  const outputPath = utils.getAbsolutePath('project-layout.json');
  await fs.promises.writeFile(outputPath, JSON.stringify(layout, null, 2));
  console.log(`Project layout generated: ${layout.stats.totalFiles} files in ${layout.stats.totalDirectories} directories (${Math.round(layout.stats.totalSize / 1024)} KB).`);
}

(async () => {
  try {
    await generateProjectLayout();
  } catch (error) {
    console.error('Failed to generate project layout:', error.message, error.stack);
    process.exit(1);
  }
})();