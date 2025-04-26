#!/usr/bin/env node

/**
 * Claude View Generator
 * Creates optimized views of project components for Claude Desktop
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const IMPL_DIR = path.join(ROOT_DIR, 'generated_implementation');
const OUTPUT_DIR = path.join(__dirname, 'views');

// File categories for semantic grouping
const FILE_CATEGORIES = {
  entrypoint: ['main.go', 'index.js', 'app.js', 'server.js', 'app.py', 'main.py'],
  config: ['config.json', 'config.js', 'config.go', 'config.py', '.env.example', 'settings.js'],
  testing: ['test', 'spec', '_test.go'],
  documentation: ['.md', 'README', 'CONTRIBUTING'],
  models: ['model', 'schema', 'entity'],
  controllers: ['controller', 'handler', 'route', 'endpoint'],
  database: ['db', 'dao', 'repository', 'store'],
  utils: ['util', 'helper', 'common']
};

/**
 * Determine the category of a file based on its name and path
 * @param {string} filePath - The file path
 * @returns {string} The category
 */
function categorizeFile(filePath) {
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  
  // Check for entrypoints
  if (FILE_CATEGORIES.entrypoint.some(entry => fileName === entry)) {
    return 'entrypoint';
  }
  
  // Check for config files
  if (FILE_CATEGORIES.config.some(entry => fileName.includes(entry))) {
    return 'config';
  }
  
  // Check for test files
  if (FILE_CATEGORIES.testing.some(entry => fileName.includes(entry) || fileDir.includes('/test'))) {
    return 'testing';
  }
  
  // Check for documentation
  if (FILE_CATEGORIES.documentation.some(entry => fileName.includes(entry) || fileName.endsWith('.md'))) {
    return 'documentation';
  }
  
  // Check for models
  if (FILE_CATEGORIES.models.some(entry => fileName.includes(entry) || fileDir.includes('/model'))) {
    return 'models';
  }
  
  // Check for controllers
  if (FILE_CATEGORIES.controllers.some(entry => fileName.includes(entry) || fileDir.includes('/controller'))) {
    return 'controllers';
  }
  
  // Check for database
  if (FILE_CATEGORIES.database.some(entry => fileName.includes(entry) || fileDir.includes('/db'))) {
    return 'database';
  }
  
  // Check for utils
  if (FILE_CATEGORIES.utils.some(entry => fileName.includes(entry) || fileDir.includes('/util'))) {
    return 'utils';
  }
  
  // Default to "other"
  return 'other';
}

/**
 * Get file metadata including size, last modified, and status
 * @param {string} filePath - The file path
 * @returns {Object} File metadata
 */
function getFileMetadata(filePath) {
  try {
    const stats = fs.statSync(filePath);
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    
    // Calculate a short file hash
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 6);
    
    return {
      size: stats.size,
      modified: stats.mtime,
      age: Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)),
      extension: ext,
      hash
    };
  } catch (err) {
    console.error(`Error getting metadata for ${filePath}: ${err.message}`);
    return {
      size: 0,
      modified: new Date(0),
      age: 0,
      extension: '',
      hash: '000000'
    };
  }
}

/**
 * Generate semantic tags for a file
 * @param {string} filePath - The file path
 * @param {Object} metadata - File metadata
 * @returns {Array} Array of semantic tags
 */
function generateTags(filePath, metadata) {
  const tags = [];
  const fileName = path.basename(filePath);
  const category = categorizeFile(filePath);
  
  // Add category as a tag
  tags.push(category);
  
  // Add language tag based on extension
  switch (metadata.extension) {
    case '.js':
      tags.push('javascript');
      break;
    case '.ts':
      tags.push('typescript');
      break;
    case '.go':
      tags.push('golang');
      break;
    case '.py':
      tags.push('python');
      break;
    case '.java':
      tags.push('java');
      break;
    case '.rs':
      tags.push('rust');
      break;
    case '.md':
      tags.push('markdown');
      break;
    case '.json':
      tags.push('json');
      break;
    case '.yml':
    case '.yaml':
      tags.push('yaml');
      break;
  }
  
  // Add specific tags based on filename patterns
  if (fileName.includes('test')) tags.push('test');
  if (fileName.startsWith('README')) tags.push('readme');
  if (fileName === 'package.json') tags.push('npm-package');
  if (fileName === 'go.mod') tags.push('go-module');
  if (fileName.endsWith('.proto')) tags.push('protobuf');
  if (fileName.includes('config')) tags.push('configuration');
  if (fileName.includes('auth')) tags.push('authentication');
  
  return tags;
}

/**
 * Scan a directory recursively
 * @param {string} dir - Directory to scan
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Object} Directory structure
 */
function scanDirectory(dir, baseDir = '') {
  const result = {
    files: [],
    directories: []
  };
  
  if (!fs.existsSync(dir)) {
    return result;
  }
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Skip hidden files and directories
      if (item.startsWith('.')) continue;
      
      const itemPath = path.join(dir, item);
      const relativePath = path.join(baseDir, item);
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules, dist, etc.
          if (['node_modules', 'dist', 'build', 'venv', '__pycache__', '.git'].includes(item)) {
            continue;
          }
          
          const subDir = scanDirectory(itemPath, relativePath);
          result.directories.push({
            name: item,
            path: relativePath,
            files: subDir.files,
            directories: subDir.directories
          });
        } else {
          const metadata = getFileMetadata(itemPath);
          const tags = generateTags(itemPath, metadata);
          
          result.files.push({
            name: item,
            path: relativePath,
            category: categorizeFile(itemPath),
            tags,
            metadata
          });
        }
      } catch (err) {
        console.error(`Error processing ${itemPath}: ${err.message}`);
      }
    }
    
    // Sort files by category then name
    result.files.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    
    // Sort directories by name
    result.directories.sort((a, b) => a.name.localeCompare(b.name));
    
    return result;
  } catch (err) {
    console.error(`Error scanning directory ${dir}: ${err.message}`);
    return result;
  }
}

/**
 * Generate a Claude-optimized view for a service
 * @param {string} serviceName - Name of the service
 * @returns {string} Markdown content
 */
function generateServiceView(serviceName) {
  const servicePath = path.join(IMPL_DIR, serviceName);
  
  if (!fs.existsSync(servicePath)) {
    return `# Service Not Found: ${serviceName}\n\nThe specified service does not exist in the implementation directory.`;
  }
  
  console.log(`Generating view for service: ${serviceName}`);
  
  // Scan the service directory
  const structure = scanDirectory(servicePath);
  
  // Generate the markdown
  const lines = [
    `# Service: ${serviceName} [CV-v1]`,
    '',
    'Claude-optimized view of service structure and files.',
    '',
    '## Service Overview',
    ''
  ];
  
  // Count files by category
  const categoryCounts = {};
  const allFiles = [];
  
  function collectFiles(dir) {
    for (const file of dir.files) {
      categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
      allFiles.push(file);
    }
    
    for (const subDir of dir.directories) {
      collectFiles(subDir);
    }
  }
  
  collectFiles(structure);
  
  // Add category summary
  for (const [category, count] of Object.entries(categoryCounts)) {
    lines.push(`- ${category}: ${count} files`);
  }
  
  lines.push('');
  lines.push('## Key Files');
  lines.push('');
  
  // Find and list key files (entrypoints, config, etc.)
  const keyCategories = ['entrypoint', 'config', 'models', 'controllers'];
  for (const category of keyCategories) {
    const keyFiles = allFiles.filter(file => file.category === category);
    
    if (keyFiles.length > 0) {
      lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} Files`);
      lines.push('');
      
      for (const file of keyFiles) {
        const tags = file.tags.filter(tag => tag !== category).map(tag => `#${tag}`).join(' ');
        lines.push(`- \`${file.path}\` ${tags} [${file.metadata.hash}]`);
      }
      
      lines.push('');
    }
  }
  
  // Add semantic directory structure
  lines.push('## Directory Structure');
  lines.push('');
  
  function renderDirectory(dir, indent = '') {
    // Show directory name
    if (dir.name) {
      lines.push(`${indent}📁 ${dir.name}/`);
    }
    
    // Show files (by category)
    const filesByCategory = {};
    for (const file of dir.files) {
      if (!filesByCategory[file.category]) {
        filesByCategory[file.category] = [];
      }
      filesByCategory[file.category].push(file);
    }
    
    // Print files by category
    for (const [category, files] of Object.entries(filesByCategory)) {
      if (files.length > 0) {
        lines.push(`${indent}  ${category}:`);
        for (const file of files) {
          lines.push(`${indent}    📄 ${file.name} #${file.tags.join(' #')}`);
        }
      }
    }
    
    // Process subdirectories
    for (const subDir of dir.directories) {
      renderDirectory(subDir, indent + '  ');
    }
  }
  
  renderDirectory(structure);
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Usage Tips');
  lines.push('');
  lines.push('- Use `@file <path>` to request specific file contents');
  lines.push('- Use `@summary <path>` to get a summary of a file');
  lines.push('- Use `@tag <tag>` to list all files with a specific tag');
  
  return lines.join('\n');
}

/**
 * Generate a Claude-optimized view for the meta layer
 * @returns {string} Markdown content
 */
function generateMetaView() {
  console.log('Generating view for meta layer');
  
  // Scan the meta directory (excluding implementation)
  const structure = {
    files: [],
    directories: []
  };
  
  try {
    const items = fs.readdirSync(ROOT_DIR);
    
    for (const item of items) {
      // Skip hidden files, implementation directory, and common exclusions
      if (item.startsWith('.') || 
          item === 'generated_implementation' || 
          item === 'node_modules' || 
          item === 'claude') {
        continue;
      }
      
      const itemPath = path.join(ROOT_DIR, item);
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          const subDir = scanDirectory(itemPath, item);
          structure.directories.push({
            name: item,
            path: item,
            files: subDir.files,
            directories: subDir.directories
          });
        } else {
          const metadata = getFileMetadata(itemPath);
          const tags = generateTags(itemPath, metadata);
          
          structure.files.push({
            name: item,
            path: item,
            category: categorizeFile(itemPath),
            tags,
            metadata
          });
        }
      } catch (err) {
        console.error(`Error processing ${itemPath}: ${err.message}`);
      }
    }
    
    // Sort files by category then name
    structure.files.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
    
    // Sort directories by name
    structure.directories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error(`Error scanning root directory: ${err.message}`);
  }
  
  // Generate the markdown
  const lines = [
    '# Meta Layer [CV-v1]',
    '',
    'Claude-optimized view of meta layer structure and files.',
    '',
    '## Overview',
    ''
  ];
  
  // Count files by category
  const categoryCounts = {};
  const allFiles = [];
  
  function collectFiles(dir) {
    for (const file of dir.files) {
      categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
      allFiles.push(file);
    }
    
    for (const subDir of dir.directories) {
      collectFiles(subDir);
    }
  }
  
  // Include root files
  for (const file of structure.files) {
    categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
    allFiles.push(file);
  }
  
  collectFiles(structure);
  
  // Add category summary
  for (const [category, count] of Object.entries(categoryCounts)) {
    lines.push(`- ${category}: ${count} files`);
  }
  
  lines.push('');
  lines.push('## Key Files');
  lines.push('');
  
  // Find and list key files (config, documentation, etc.)
  const keyCategories = ['config', 'documentation'];
  for (const category of keyCategories) {
    const keyFiles = allFiles.filter(file => file.category === category);
    
    if (keyFiles.length > 0) {
      lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} Files`);
      lines.push('');
      
      for (const file of keyFiles) {
        const tags = file.tags.filter(tag => tag !== category).map(tag => `#${tag}`).join(' ');
        lines.push(`- \`${file.path}\` ${tags} [${file.metadata.hash}]`);
      }
      
      lines.push('');
    }
  }
  
  // Add semantic directory structure
  lines.push('## Root Files');
  lines.push('');
  
  // Display root files by category
  const rootFilesByCategory = {};
  for (const file of structure.files) {
    if (!rootFilesByCategory[file.category]) {
      rootFilesByCategory[file.category] = [];
    }
    rootFilesByCategory[file.category].push(file);
  }
  
  // Print root files by category
  for (const [category, files] of Object.entries(rootFilesByCategory)) {
    if (files.length > 0) {
      lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
      lines.push('');
      for (const file of files) {
        lines.push(`📄 ${file.name} #${file.tags.join(' #')}`);
      }
      lines.push('');
    }
  }
  
  // Add directory structure
  lines.push('## Directories');
  lines.push('');
  
  for (const dir of structure.directories) {
    lines.push(`### 📁 ${dir.name}/`);
    lines.push('');
    
    // Count files in directory by category
    const dirCategoryCounts = {};
    function countDirFiles(d) {
      for (const file of d.files) {
        dirCategoryCounts[file.category] = (dirCategoryCounts[file.category] || 0) + 1;
      }
      
      for (const subDir of d.directories) {
        countDirFiles(subDir);
      }
    }
    
    countDirFiles(dir);
    
    // Show category summary for directory
    for (const [category, count] of Object.entries(dirCategoryCounts)) {
      lines.push(`- ${category}: ${count} files`);
    }
    
    lines.push('');
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Usage Tips');
  lines.push('');
  lines.push('- Use `@file <path>` to request specific file contents');
  lines.push('- Use `@summary <path>` to get a summary of a file');
  lines.push('- Use `@tag <tag>` to list all files with a specific tag');
  
  return lines.join('\n');
}

/**
 * Find all services in the implementation directory
 * @returns {Array} List of service names
 */
function findServices() {
  if (!fs.existsSync(IMPL_DIR)) {
    return [];
  }
  
  try {
    return fs.readdirSync(IMPL_DIR)
      .filter(item => {
        const fullPath = path.join(IMPL_DIR, item);
        return fs.statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'templates';
      });
  } catch (err) {
    console.error(`Error finding services: ${err.message}`);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('DStudio Claude View Generator');
  console.log('============================');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Generate meta view
  const metaView = generateMetaView();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'meta.md'), metaView);
  console.log(`Meta view written to: ${path.join(OUTPUT_DIR, 'meta.md')}`);
  
  // Find all services
  const services = findServices();
  
  console.log(`Found ${services.length} services`);
  
  // Generate service views
  for (const service of services) {
    const serviceView = generateServiceView(service);
    fs.writeFileSync(path.join(OUTPUT_DIR, `service-${service}.md`), serviceView);
    console.log(`Service view written to: ${path.join(OUTPUT_DIR, `service-${service}.md`)}`);
  }
  
  // Generate an index file
  const indexLines = [
    '# Claude Views Index',
    '',
    'Available Claude-optimized views:',
    '',
    '- [Meta Layer](./meta.md)'
  ];
  
  for (const service of services) {
    indexLines.push(`- [Service: ${service}](./service-${service}.md)`);
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.md'), indexLines.join('\n'));
  console.log(`Index written to: ${path.join(OUTPUT_DIR, 'index.md')}`);
  
  console.log('View generation complete!');
}

// Run the main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
