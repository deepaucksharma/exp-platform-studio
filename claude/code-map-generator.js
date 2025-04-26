#!/usr/bin/env node

/**
 * Semantic Code Map Generator for Claude Desktop
 * Creates semantic tags and visualizations of code structure
 * Updated to use standardized DStudio utilities
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('CodeMapGenerator');
const path = require('path');

// Configuration
const IMPL_DIR = utils.config.getImplementationDir();
const OUTPUT_DIR = utils.path.resolveProjectPath('claude', 'code-maps');

// Language-specific patterns for detecting important code elements
const LANGUAGE_PATTERNS = {
  javascript: {
    component: /export\s+(default\s+)?((class|function)\s+)?([A-Za-z0-9_]+)/g,
    route: /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    controller: /class\s+([A-Za-z0-9_]+Controller)/g,
    model: /class\s+([A-Za-z0-9_]+)(Model|Schema)/g,
    api: /(fetch|axios)\s*\.\s*(get|post|put|delete|patch)/g
  },
  python: {
    class: /class\s+([A-Za-z0-9_]+)/g,
    function: /def\s+([A-Za-z0-9_]+)/g,
    route: /@(app|blueprint|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    model: /class\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_.]+Model|db\.Model)/g
  },
  go: {
    function: /func\s+([A-Za-z0-9_]+)/g,
    method: /func\s+\(\s*[A-Za-z0-9_]+\s+\*?([A-Za-z0-9_]+)\s*\)\s*([A-Za-z0-9_]+)/g,
    struct: /type\s+([A-Za-z0-9_]+)\s+struct/g,
    interface: /type\s+([A-Za-z0-9_]+)\s+interface/g,
    handler: /func\s+([A-Za-z0-9_]+Handler|[A-Za-z0-9_]+Handler\s*\()/g
  },
  rust: {
    function: /fn\s+([A-Za-z0-9_]+)/g,
    struct: /struct\s+([A-Za-z0-9_]+)/g,
    trait: /trait\s+([A-Za-z0-9_]+)/g,
    impl: /impl\s+([A-Za-z0-9_]+)/g
  },
  java: {
    class: /class\s+([A-Za-z0-9_]+)/g,
    method: /(?:public|private|protected|static)\s+[A-Za-z0-9_<>,\s]+\s+([A-Za-z0-9_]+)\s*\(/g,
    controller: /class\s+([A-Za-z0-9_]+Controller)/g,
    service: /class\s+([A-Za-z0-9_]+Service)/g,
    repository: /class\s+([A-Za-z0-9_]+Repository)/g
  }
};

/**
 * Determine the language for a file based on its extension
 * @param {string} filePath - Path to the file
 * @returns {string|null} Language name or null if not recognized
 */
function getFileLanguage(filePath) {
  const ext = utils.path.getExtension(filePath).toLowerCase();
  
  switch (ext) {
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
      return 'javascript';
    case '.py':
      return 'python';
    case '.go':
      return 'go';
    case '.rs':
      return 'rust';
    case '.java':
      return 'java';
    default:
      return null;
  }
}

/**
 * Analyze a file to extract semantic information
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeFile(filePath) {
  const result = {
    path: filePath,
    language: null,
    elements: [],
    imports: [],
    dependencies: [],
    tags: []
  };
  
  // Check if file exists
  if (!utils.path.pathExists(filePath)) {
    return result;
  }
  
  // Get file language
  result.language = getFileLanguage(filePath);
  if (!result.language) {
    return result;
  }
  
  // Read file content
  const fileResult = await utils.file.readFile(filePath);
  if (!fileResult.success) {
    logger.warn(`Failed to read file ${filePath}: ${fileResult.error?.message}`);
    return result;
  }
  
  const content = fileResult.value;
  
  // Add file type as a tag
  result.tags.push(result.language);
  
  // Detect imports
  if (result.language === 'javascript') {
    // Match import statements in JavaScript
    const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      result.imports.push(match[1]);
    }
    
    // Match require statements
    const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const match of requireMatches) {
      result.imports.push(match[1]);
    }
  } else if (result.language === 'python') {
    // Match import statements in Python
    const importMatches = content.matchAll(/(?:import|from)\s+([A-Za-z0-9_.]+)/g);
    for (const match of importMatches) {
      result.imports.push(match[1]);
    }
  } else if (result.language === 'go') {
    // Match import statements in Go
    const importMatches = content.matchAll(/import\s+\(\s*((?:.|\n)*?)\s*\)/g);
    for (const match of importMatches) {
      const importBlock = match[1];
      const individualImports = importBlock.matchAll(/\s*(?:[A-Za-z0-9_]+\s+)?["']([^"']+)["']/g);
      for (const importMatch of individualImports) {
        result.imports.push(importMatch[1]);
      }
    }
    
    // Match single imports
    const singleImports = content.matchAll(/import\s+(?:[A-Za-z0-9_]+\s+)?["']([^"']+)["']/g);
    for (const match of singleImports) {
      result.imports.push(match[1]);
    }
  }
  
  // Detect language-specific elements
  const patterns = LANGUAGE_PATTERNS[result.language];
  if (patterns) {
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        // Different patterns have different capturing groups
        let name;
        if (type === 'route' && result.language === 'python') {
          name = match[3]; // Python route has method in group 2
        } else if (type === 'route' && result.language === 'javascript') {
          name = match[2]; // JS route has method in group 1
        } else if (type === 'method' && result.language === 'go') {
          name = `${match[1]}.${match[2]}`; // Go method combines receiver and method name
        } else {
          name = match[1]; // Most patterns have the name in group 1
        }
        
        result.elements.push({
          type,
          name
        });
        
        // Add as a tag
        result.tags.push(type);
      }
    }
  }
  
  // Add special tags based on filename and path
  const fileName = utils.path.getFilename(filePath);
  if (fileName.includes('test')) result.tags.push('test');
  if (fileName.includes('controller')) result.tags.push('controller');
  if (fileName.includes('model')) result.tags.push('model');
  if (fileName.includes('router')) result.tags.push('router');
  if (fileName.includes('service')) result.tags.push('service');
  if (fileName.includes('util')) result.tags.push('utility');
  
  // Deduplicate tags
  result.tags = [...new Set(result.tags)];
  
  return result;
}

/**
 * Scan a directory for code files
 * @param {string} dir - Directory to scan
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Promise<Array>} Array of file paths
 */
async function scanDirectory(dir, baseDir = '') {
  const files = [];
  
  if (!utils.path.pathExists(dir)) {
    return files;
  }
  
  const dirResult = await utils.file.readDirectory(dir);
  if (!dirResult.success) {
    logger.warn(`Failed to read directory ${dir}: ${dirResult.error?.message}`);
    return files;
  }
  
  for (const entry of dirResult.value) {
    // Skip hidden files and directories
    if (entry.name.startsWith('.')) continue;
    
    const itemPath = utils.path.joinPath(dir, entry.name);
    const relativePath = utils.path.joinPath(baseDir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (['node_modules', 'dist', 'build', 'venv', '__pycache__', '.git'].includes(entry.name)) {
        continue;
      }
      
      const subFiles = await scanDirectory(itemPath, relativePath);
      files.push(...subFiles);
    } else {
      // Only include code files
      const ext = utils.path.getExtension(entry.name).toLowerCase();
      if (['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java'].includes(ext)) {
        files.push({
          path: itemPath,
          relativePath
        });
      }
    }
  }
  
  return files;
}

/**
 * Generate a semantic code map for a service
 * @param {string} serviceName - Name of the service
 * @returns {Promise<string>} Markdown content
 */
async function generateCodeMap(serviceName) {
  const servicePath = utils.path.joinPath(IMPL_DIR, serviceName);
  
  if (!utils.path.pathExists(servicePath)) {
    return `# Code Map: Service Not Found\n\nThe specified service '${serviceName}' does not exist in the implementation directory.`;
  }
  
  logger.info(`Generating code map for service: ${serviceName}`);
  
  // Scan for code files
  const files = await scanDirectory(servicePath);
  
  if (files.length === 0) {
    return `# Code Map: No Code Files\n\nNo code files were found in the service '${serviceName}'.`;
  }
  
  // Analyze each file
  const analyzedFiles = [];
  
  for (const file of files) {
    const analysis = await analyzeFile(file.path);
    analysis.relativePath = file.relativePath;
    analyzedFiles.push(analysis);
  }
  
  // Group files by language
  const filesByLanguage = {};
  const allTags = new Set();
  
  for (const file of analyzedFiles) {
    if (!file.language) continue;
    
    if (!filesByLanguage[file.language]) {
      filesByLanguage[file.language] = [];
    }
    
    filesByLanguage[file.language].push(file);
    
    // Collect all tags
    for (const tag of file.tags) {
      allTags.add(tag);
    }
  }
  
  // Generate the markdown
  const lines = [
    `# Code Map: ${serviceName} [CCM-v2]`,
    '',
    'Semantic code map showing structure and relationships.',
    '',
    '## Overview',
    ''
  ];
  
  // Add language summary
  for (const [language, files] of Object.entries(filesByLanguage)) {
    lines.push(`- ${language}: ${files.length} files`);
  }
  
  lines.push('');
  lines.push('## Tags');
  lines.push('');
  
  // Add tags list
  const sortedTags = [...allTags].sort();
  const tagGroups = [];
  let currentGroup = [];
  
  for (const tag of sortedTags) {
    currentGroup.push(tag);
    
    if (currentGroup.length === 5) {
      tagGroups.push(currentGroup);
      currentGroup = [];
    }
  }
  
  if (currentGroup.length > 0) {
    tagGroups.push(currentGroup);
  }
  
  for (const group of tagGroups) {
    lines.push(`- ${group.map(tag => `#${tag}`).join(' ')}`);
  }
  
  // Add directory structure with semantic information
  lines.push('');
  lines.push('## Directory Structure');
  lines.push('');
  
  // Build a tree structure
  const tree = {};
  
  for (const file of analyzedFiles) {
    if (!file.relativePath) continue;
    
    const dirs = file.relativePath.split(path.sep);
    const fileName = dirs.pop();
    
    let current = tree;
    for (const dir of dirs) {
      if (!current[dir]) {
        current[dir] = { __files: [] };
      }
      current = current[dir];
    }
    
    current.__files = current.__files || [];
    current.__files.push({
      name: fileName,
      tags: file.tags,
      elements: file.elements
    });
  }
  
  // Render the tree
  function renderTree(node, prefix = '') {
    const dirs = Object.keys(node).filter(key => key !== '__files').sort();
    const files = node.__files || [];
    
    for (const dir of dirs) {
      lines.push(`${prefix}📁 ${dir}/`);
      renderTree(node[dir], `${prefix}  `);
    }
    
    for (const file of files) {
      const tags = file.tags.map(tag => `#${tag}`).join(' ');
      lines.push(`${prefix}📄 ${file.name} ${tags}`);
      
      // Add file elements if any
      if (file.elements && file.elements.length > 0) {
        const groupedElements = {};
        
        for (const elem of file.elements) {
          if (!groupedElements[elem.type]) {
            groupedElements[elem.type] = [];
          }
          groupedElements[elem.type].push(elem.name);
        }
        
        for (const [type, names] of Object.entries(groupedElements)) {
          if (names.length <= 3) {
            lines.push(`${prefix}  - ${type}: ${names.join(', ')}`);
          } else {
            lines.push(`${prefix}  - ${type}: ${names.slice(0, 3).join(', ')} +${names.length - 3} more`);
          }
        }
      }
    }
  }
  
  renderTree(tree);
  
  // Add key components section
  lines.push('');
  lines.push('## Key Components');
  lines.push('');
  
  // Find important components by type
  const keyTypes = ['controller', 'model', 'router', 'service'];
  
  for (const type of keyTypes) {
    const componentsOfType = [];
    
    for (const file of analyzedFiles) {
      if (file.tags.includes(type)) {
        componentsOfType.push({
          file: file.relativePath,
          elements: file.elements.filter(elem => elem.type === type || elem.type === 'class' || elem.type === 'function')
        });
      }
    }
    
    if (componentsOfType.length > 0) {
      lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}s`);
      lines.push('');
      
      for (const component of componentsOfType) {
        lines.push(`- \`${component.file}\``);
        
        if (component.elements.length > 0) {
          const elementNames = component.elements.map(elem => elem.name);
          if (elementNames.length <= 3) {
            lines.push(`  - ${elementNames.join(', ')}`);
          } else {
            lines.push(`  - ${elementNames.slice(0, 3).join(', ')} +${elementNames.length - 3} more`);
          }
        }
      }
      
      lines.push('');
    }
  }
  
  // Add quick reference for file locations by tag
  lines.push('## Files by Tag');
  lines.push('');
  
  const coreCodeTags = ['controller', 'model', 'router', 'service', 'utility', 'api'];
  
  for (const tag of coreCodeTags) {
    const filesWithTag = analyzedFiles.filter(file => file.tags.includes(tag));
    
    if (filesWithTag.length > 0) {
      lines.push(`### #${tag}`);
      lines.push('');
      
      for (const file of filesWithTag) {
        lines.push(`- \`${file.relativePath}\``);
      }
      
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate a semantic code map for all services
 */
async function generateAllCodeMaps() {
  // Find all services using the project utility
  const servicesResult = utils.project.getServices();
  
  if (!servicesResult.success || servicesResult.value.length === 0) {
    logger.warn('No services found');
    return;
  }
  
  const services = servicesResult.value.map(service => service.name);
  logger.info(`Found ${services.length} services`);
  
  // Generate code maps for each service
  for (const service of services) {
    const codeMap = await generateCodeMap(service);
    const outputPath = utils.path.joinPath(OUTPUT_DIR, `${service}.md`);
    
    const writeResult = await utils.file.writeFile(outputPath, codeMap);
    if (writeResult.success) {
      logger.info(`Code map for ${service} written to: ${outputPath}`);
    } else {
      logger.error(`Failed to write code map for ${service}: ${writeResult.error?.message}`);
    }
  }
  
  // Generate an index file
  const indexLines = [
    '# Code Maps Index',
    '',
    'Available semantic code maps:',
    ''
  ];
  
  for (const service of services) {
    indexLines.push(`- [${service}](./${service}.md)`);
  }
  
  const indexPath = utils.path.joinPath(OUTPUT_DIR, 'index.md');
  const writeResult = await utils.file.writeFile(indexPath, indexLines.join('\n'));
  
  if (writeResult.success) {
    logger.info(`Index written to: ${indexPath}`);
  } else {
    logger.error(`Failed to write index: ${writeResult.error?.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  logger.info('DStudio Semantic Code Map Generator');
  logger.info('==================================');
  
  // Create output directory if it doesn't exist
  utils.path.ensureDir(OUTPUT_DIR);
  
  // Generate code maps
  await generateAllCodeMaps();
  
  logger.info('Code map generation complete!');
}

// Run the main function with error handling
utils.error.withErrorHandling(main, {
  exitOnError: true,
  logErrors: true
})();
