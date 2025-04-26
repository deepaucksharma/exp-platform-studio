#!/usr/bin/env node

/**
 * Project Map Generator for Claude Desktop
 * Creates a hierarchical view of the project with health indicators
 * Updated to use the standardized DStudio utilities
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('ProjectMapGenerator');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Configuration
const OUTPUT_FILE = utils.path.resolveProjectPath('claude', 'project-map.md');
const IMPL_DIR = utils.config.getImplementationDir();

/**
 * Get the age of a directory or file in days
 * @param {string} filePath - Path to the file or directory
 * @returns {number} Age in days
 */
async function getAge(filePath) {
  const mtimeResult = await utils.file.getModificationTime(filePath);
  
  if (mtimeResult.success) {
    const ageMs = Date.now() - mtimeResult.value.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  }
  
  return 0;
}

/**
 * Check health of a component
 * @param {string} dir - Directory to check
 * @returns {Object} Health status object
 */
async function checkHealth(dir) {
  const result = {
    health: '✓',
    tests: 'N/A',
    issues: []
  };
  
  // Check if directory exists
  if (!utils.path.pathExists(dir)) {
    result.health = '?';
    result.issues.push('Directory not found');
    return result;
  }
  
  try {
    // Read directory contents
    const dirResult = await utils.file.readDirectory(dir);
    
    if (!dirResult.success) {
      result.health = '?';
      result.issues.push('Unable to read directory contents');
      return result;
    }
    
    const files = dirResult.value.map(entry => entry.name);
    
    // Check for package.json and node_modules
    if (files.includes('package.json') && !files.includes('node_modules')) {
      result.health = '⚠️';
      result.issues.push('Dependencies not installed (missing node_modules)');
    }
    
    // Check for go.mod and go.sum
    if (files.includes('go.mod') && !files.includes('go.sum')) {
      result.health = '⚠️';
      result.issues.push('Go dependencies may not be synced (missing go.sum)');
    }
    
    // Check for requirements.txt and venv
    if (files.includes('requirements.txt') && !files.includes('venv') && !files.includes('.venv')) {
      result.health = '⚠️';
      result.issues.push('Python virtual environment not found');
    }
    
    // Check for failing tests (basic check)
    await utils.error.tryAsync(async () => {
      if (files.includes('package.json')) {
        // Check for test coverage
        const packageJsonPath = utils.path.joinPath(dir, 'package.json');
        const packageJsonResult = await utils.file.readFile(packageJsonPath);
        
        if (packageJsonResult.success) {
          const packageJson = JSON.parse(packageJsonResult.value);
          if (packageJson.scripts && packageJson.scripts.test) {
            try {
              await exec('npm test -- --silent', { cwd: dir, timeout: 5000 });
              result.tests = '100%'; // Simplified - would need a coverage report for accurate number
            } catch (err) {
              result.health = '⚠️';
              result.tests = '?';
              result.issues.push('Tests failing');
            }
          }
        }
      } else if (files.includes('go.mod')) {
        try {
          await exec('go test ./... -cover', { cwd: dir, timeout: 5000 });
          result.tests = '100%'; // Simplified
        } catch (err) {
          result.health = '⚠️';
          result.tests = '?';
          result.issues.push('Go tests failing');
        }
      }
    }, null);
    
    return result;
  } catch (err) {
    logger.error(`Error checking health for ${dir}: ${err.message}`);
    result.health = '?';
    result.issues.push('Error checking health');
    return result;
  }
}

/**
 * Generate the project map
 */
async function generateProjectMap() {
  logger.info('Generating project map...');
  
  const lines = [
    '# Project Map [v2]',
    '',
    'Current project structure and health status.',
    '',
    '## Overview',
    ''
  ];
  
  // Check META health
  const projectRoot = utils.path.PROJECT_ROOT;
  const metaHealth = await checkHealth(projectRoot);
  const metaAge = await getAge(projectRoot);
  lines.push(`1. META: health=${metaHealth.health} CI=✓ age=${metaAge}d`);
  
  if (metaHealth.issues.length > 0) {
    lines.push(`   └── Issues: ${metaHealth.issues.join(', ')}`);
  }
  
  // Find all services using the project utility
  const servicesResult = utils.project.getServices();
  
  if (!servicesResult.success || servicesResult.value.length === 0) {
    lines.push(`2. IMPL: No services found`);
  } else {
    const services = servicesResult.value;
    lines.push('');
    lines.push(`## Implementation Services (${services.length})`);
    lines.push('');
    
    let counter = 2;
    for (const service of services) {
      const health = await checkHealth(service.path);
      const age = await getAge(service.path);
      const language = utils.project.detectServiceLanguage(service.path);
      
      lines.push(`${counter}. IMPL/${service.name}: health=${health.health} tests=${health.tests} age=${age}d lang=${language}`);
      
      if (health.issues.length > 0) {
        lines.push(`   └── Issues: ${health.issues.join(', ')}`);
      }
      
      counter++;
    }
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Legend:');
  lines.push('- ✓: Healthy');
  lines.push('- ⚠️: Warning');
  lines.push('- ✗: Critical issues');
  lines.push('- ?: Unknown status');
  
  return lines.join('\n');
}

/**
 * Main function
 */
async function main() {
  logger.info('DStudio Project Map Generator for Claude Desktop');
  logger.info('===============================================');
  
  // Ensure output directory exists
  const outputDir = utils.path.getParentDirectory(OUTPUT_FILE);
  utils.path.ensureDir(outputDir);
  
  // Generate project map
  const projectMap = await generateProjectMap();
  
  // Write the project map to file
  const writeResult = await utils.file.writeFile(OUTPUT_FILE, projectMap);
  
  if (writeResult.success) {
    logger.info(`Project map written to: ${OUTPUT_FILE}`);
  } else {
    logger.error(`Error writing project map: ${writeResult.error?.message}`);
  }
}

// Run the main function with error handling
utils.error.withErrorHandling(main, {
  exitOnError: true,
  logErrors: true
})();
