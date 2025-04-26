#!/usr/bin/env node

/**
 * Project Layout Generator
 * Creates a map of the project structure with SHA-256 checksums
 * Focuses specifically on the implementation directory
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const IGNORE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', '.cache',
  '*.log', '*.lock', '*.tmp', '*.temp'
];
const IMPLEMENTATION_DIR = 'generated_implementation';

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

      if (IGNORE_PATTERNS.some(pattern => matchesPattern(item, pattern))) {
        continue;
      }

      try {
        const stats = await fs.promises.stat(itemPath);

        if (stats.isDirectory()) {
          result.directories[item] = await scanDirectory(itemPath, relativePath);
        } else {
          result.files[item] = {
            size: stats.size,
            modified: stats.mtime.toISOString(),
            hash: await getFileHash(itemPath)
          };
        }
      } catch (statErr) {
        console.error(`Error stating path ${itemPath}:`, statErr.message);
        if (statErr.code === 'ENOENT') continue;
        result.files[item] = { size: 0, modified: new Date(0).toISOString(), hash: 'error-stating-file' };
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err.message);
  }

  return result;
}

// Main function
async function generateProjectLayout() {
  const rootDir = process.cwd();
  
  // Ensure implementation directory exists
  const implDir = path.join(rootDir, IMPLEMENTATION_DIR);
  if (!fs.existsSync(implDir)) {
    try {
      await fs.promises.mkdir(implDir, { recursive: true });
      console.log(`Created implementation directory: ${IMPLEMENTATION_DIR}`);
    } catch (err) {
      console.error(`Error creating implementation directory: ${err.message}`);
    }
  }

  const layout = {
    version: '1.1',
    generated: new Date().toISOString(),
    rootDirectory: IMPLEMENTATION_DIR,
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

  await fs.promises.writeFile('project-layout.json', JSON.stringify(layout, null, 2));
  console.log(`Project layout generated: ${layout.stats.totalFiles} files in ${layout.stats.totalDirectories} directories in ${IMPLEMENTATION_DIR}.`);
}

(async () => {
  try {
    await generateProjectLayout();
  } catch (error) {
    console.error('Failed to generate project layout:', error.message, error.stack);
    process.exit(1);
  }
})();