#!/usr/bin/env node

/**
 * Project Layout Generator
 * Creates a map of the project structure with SHA-256 checksums
 * Focuses specifically on the implementation directory
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('LayoutGenerator');

// Maximum file size for hashing (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Recursively scan directories
 * @param {string} dirPath - Directory to scan
 * @param {string} baseDir - Base directory for relative paths
 * @param {boolean} isImplRoot - Whether this is the implementation root directory
 * @returns {Promise<Object>} Directory structure with files and subdirectories
 */
async function scanDirectory(dirPath, baseDir = '', isImplRoot = false) {
  const result = { directories: {}, files: {} };

  // Get directory entries
  const entriesResult = await utils.file.readDirectory(dirPath);
  if (!entriesResult.success) {
    logger.warn(`Failed to read directory ${dirPath}: ${entriesResult.error?.message}`);
    return result;
  }

  // Process each entry
  for (const entry of entriesResult.value) {
    const itemPath = utils.path.joinPath(dirPath, entry.name);
    const relativePath = utils.path.joinPath(baseDir, entry.name);

    // Skip excluded directories
    if (utils.config.isExcludedDir(entry.name)) {
      continue;
    }

    // Get file/directory stats
    const statsResult = await utils.error.tryAsync(async () => {
      return await utils.file.getModificationTime(itemPath);
    });

    if (!statsResult.success) {
      logger.warn(`Failed to get stats for ${itemPath}: ${statsResult.error?.message}`);
      continue;
    }

    if (entry.isDirectory()) {
      // Check if this is a service directory within implementation root
      if (isImplRoot && utils.project.isServiceDirectory(itemPath)) {
        // Mark as a service in the structure
        result.directories[entry.name] = await scanDirectory(itemPath, relativePath, false);
        result.directories[entry.name].isService = true;
      } else {
        result.directories[entry.name] = await scanDirectory(itemPath, relativePath, false);
      }
    } else if (entry.isFile()) {
      // Get file size
      const sizeResult = await utils.error.tryAsync(async () => {
        const stats = await utils.path.getStats(itemPath);
        return stats.value.size;
      }, 0);

      const fileSize = sizeResult.value;
      
      // Get file hash for files under size limit
      let fileHash;
      if (fileSize <= MAX_FILE_SIZE) {
        const hashResult = await utils.file.calculateChecksum(itemPath);
        fileHash = hashResult.success ? hashResult.value : 'error-calculating-hash';
      } else {
        fileHash = 'skipped-large-file';
      }

      result.files[entry.name] = {
        size: fileSize,
        modified: statsResult.value.toISOString(),
        hash: fileHash,
        ...(fileSize > MAX_FILE_SIZE ? { note: 'File exceeds 50MB size limit for hashing' } : {})
      };
    }
  }

  return result;
}

/**
 * Count statistics from a directory structure
 * @param {Object} struct - Directory structure
 * @returns {Object} Counts of directories, files, and total size
 */
function countStats(struct) {
  let dirs = 0, files = 0, size = 0;
  
  dirs += Object.keys(struct.directories).length;
  files += Object.keys(struct.files).length;
  
  for (const file of Object.values(struct.files)) {
    size += file.size;
  }
  
  for (const dir of Object.values(struct.directories)) {
    const subStats = countStats(dir);
    dirs += subStats.dirs;
    files += subStats.files;
    size += subStats.size;
  }
  
  return { dirs, files, size };
}

/**
 * Main function to generate the project layout
 */
async function generateProjectLayout() {
  logger.info('Generating project layout...');
  
  // Get the implementation directory path
  const implDir = utils.config.getImplementationDir();
  const implDirRelative = utils.config.get('workspace.implementationDir', './generated_implementation');
  
  // Ensure implementation directory exists
  if (!utils.path.pathExists(implDir)) {
    if (utils.path.ensureDir(implDir)) {
      logger.info(`Created implementation directory: ${implDirRelative}`);
    } else {
      logger.error(`Failed to create implementation directory: ${implDir}`);
      return;
    }
  }

  logger.info(`Scanning implementation directory: ${implDirRelative}`);
  
  // Scan the directory structure
  const structure = await scanDirectory(implDir, '', true);
  
  // Create the layout data structure
  const layout = {
    version: '1.2',
    generated: new Date().toISOString(),
    rootDirectory: implDirRelative,
    structure,
    stats: {
      totalDirectories: 0,
      totalFiles: 0,
      totalSize: 0,
      services: []
    }
  };
  
  // Identify services for reporting
  for (const [dirName, dirInfo] of Object.entries(layout.structure.directories)) {
    if (dirInfo.isService) {
      layout.stats.services.push(dirName);
    }
  }

  // Calculate statistics
  const stats = countStats(layout.structure);
  layout.stats.totalDirectories = stats.dirs;
  layout.stats.totalFiles = stats.files;
  layout.stats.totalSize = stats.size;

  // Write the layout file
  const outputPath = utils.path.resolveProjectPath('project-layout.json');
  const writeResult = await utils.file.writeFile(outputPath, JSON.stringify(layout, null, 2));
  
  if (writeResult.success) {
    logger.info(`Project layout generated: ${layout.stats.totalFiles} files in ${layout.stats.totalDirectories} directories (${Math.round(layout.stats.totalSize / 1024)} KB).`);
    logger.info(`Services detected: ${layout.stats.services.length > 0 ? layout.stats.services.join(', ') : 'None'}`);
  } else {
    logger.error(`Failed to write project layout to ${outputPath}: ${writeResult.error?.message}`);
  }
}

// Run the main function with error handling
utils.error.withErrorHandling(async () => {
  await generateProjectLayout();
}, {
  exitOnError: true,
  logErrors: true,
  defaultErrorType: utils.error.ERROR_TYPES.FILE_SYSTEM
})();
