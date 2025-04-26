/**
 * Project Utilities
 * DStudio-specific project management functions
 */

const fs = require('fs');
const path = require('path');
const { tryAsync, trySync, ValidationError } = require('./error-utils');
const fileUtils = require('./file-utils');
const configUtils = require('./config-utils');
const pathUtils = require('./path-utils');
const cacheUtils = require('./cache-utils');

// Project structure constants
const SERVICES_DIR = pathUtils.resolveProjectPath('docs', 'services');
const STATUS_DIR = pathUtils.resolveProjectPath('status');
const PROJECT_STATUS_FILE = pathUtils.resolveProjectPath('project-status.md');
const STATUS_FILE_PATTERN = /^status-(.+)\.md$/;

/**
 * Service directory indicators (files that indicate a service)
 */
const SERVICE_INDICATORS = [
  'package.json',
  'go.mod',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'pom.xml',
  'build.gradle'
];

/**
 * Check if a directory is a service
 * @param {string} dirPath - Path to directory
 * @returns {boolean} True if directory appears to be a service
 */
function isServiceDirectory(dirPath) {
  if (!pathUtils.isDirectory(dirPath)) return false;
  
  // Check for service indicator files
  return SERVICE_INDICATORS.some(indicator => 
    pathUtils.pathExists(path.join(dirPath, indicator))
  );
}

/**
 * Get all services in the implementation directory
 * @returns {Object} Result object with success flag and array of services
 */
function getServices() {
  const implDir = configUtils.getImplementationDir();
  
  if (!pathUtils.pathExists(implDir)) {
    return { success: false, value: [], error: `Implementation directory not found: ${implDir}` };
  }
  
  return trySync(() => {
    const dirs = fs.readdirSync(implDir, { withFileTypes: true });
    const services = [];
    
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      
      const dirPath = path.join(implDir, dir.name);
      
      if (isServiceDirectory(dirPath)) {
        services.push({
          name: dir.name,
          path: dirPath,
          relativePath: path.relative(pathUtils.PROJECT_ROOT, dirPath)
        });
      }
    }
    
    return services;
  }, []);
}

/**
 * Detect the programming language of a service
 * @param {string} servicePath - Path to service directory
 * @returns {string} Detected language or 'unknown'
 */
function detectServiceLanguage(servicePath) {
  const indicators = {
    'javascript': ['package.json', 'package-lock.json', 'yarn.lock', 'node_modules'],
    'typescript': ['tsconfig.json', '.ts', '.tsx'],
    'python': ['requirements.txt', 'setup.py', 'pyproject.toml', '.py'],
    'go': ['go.mod', 'go.sum', '.go'],
    'rust': ['Cargo.toml', 'Cargo.lock', '.rs'],
    'java': ['pom.xml', 'build.gradle', '.java'],
    'csharp': ['.csproj', '.cs']
  };
  
  if (!pathUtils.isDirectory(servicePath)) {
    return 'unknown';
  }
  
  return trySync(() => {
    // Check for language-specific files in the root
    for (const [language, fileIndicators] of Object.entries(indicators)) {
      for (const indicator of fileIndicators) {
        if (indicator.startsWith('.')) {
          // Extension-based check
          const ext = indicator;
          const hasFiles = findFilesWithExtension(servicePath, ext);
          if (hasFiles) return language;
        } else {
          // Specific file check
          if (pathUtils.pathExists(path.join(servicePath, indicator))) {
            return language;
          }
        }
      }
    }
    
    return 'unknown';
  }, 'unknown').value;
}

/**
 * Check if a directory has files with a specific extension
 * @param {string} dirPath - Directory path
 * @param {string} extension - File extension to check
 * @returns {boolean} True if matching files found
 */
function findFilesWithExtension(dirPath, extension) {
  if (!extension.startsWith('.')) {
    extension = '.' + extension;
  }
  
  return trySync(() => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(extension)) {
        return true;
      }
    }
    
    return false;
  }, false).value;
}

/**
 * Read and parse agent status files
 * @returns {Object} Result object with success flag and array of agent statuses
 */
function readAgentStatusFiles() {
  if (!pathUtils.pathExists(STATUS_DIR)) {
    return { success: false, value: [], error: `Status directory not found: ${STATUS_DIR}` };
  }
  
  return trySync(() => {
    const files = fs.readdirSync(STATUS_DIR);
    const agentStatuses = [];
    
    for (const file of files) {
      const match = file.match(STATUS_FILE_PATTERN);
      if (!match) continue;
      
      const agentId = match[1];
      const filePath = path.join(STATUS_DIR, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        agentStatuses.push({
          agentId,
          content,
          lastModified: stats.mtime,
          file
        });
      } catch (err) {
        // Skip files we can't read
      }
    }
    
    // Sort by last modified time (most recent first)
    agentStatuses.sort((a, b) => b.lastModified - a.lastModified);
    
    return agentStatuses;
  }, []);
}

/**
 * Generate or update the merged project status file
 * @returns {Object} Result object with success flag
 */
function generateProjectStatus() {
  const result = readAgentStatusFiles();
  
  if (!result.success || result.value.length === 0) {
    return { 
      success: false, 
      error: result.error || 'No agent status files found' 
    };
  }
  
  const agentStatuses = result.value;
  
  // Check if the project status file exists and read header
  let header = '';
  if (pathUtils.pathExists(PROJECT_STATUS_FILE)) {
    const headerResult = trySync(() => {
      const content = fs.readFileSync(PROJECT_STATUS_FILE, 'utf8');
      const headerMatch = content.match(/^([\s\S]+?)(?=## Agent:|$)/);
      return headerMatch ? headerMatch[1] : '';
    }, '');
    
    header = headerResult.value;
  }
  
  // If no header found, create a default one
  if (!header.trim()) {
    header = `# Project Status
*Last updated: ${new Date().toISOString()}*

This file is automatically generated from individual agent status files in the \`status/\` directory.
Do not edit this file directly - your changes will be overwritten.

---

`;
  } else {
    // Update the timestamp in the existing header
    header = header.replace(
      /\*Last updated: .*\*/,
      `*Last updated: ${new Date().toISOString()}*`
    );
  }
  
  // Build the content
  let content = header;
  
  for (const status of agentStatuses) {
    // Normalize header levels to ensure Agent headers are level 2
    let agentContent = status.content;
    
    // If content doesn't start with a header for the agent, add one
    if (!agentContent.trim().startsWith('## Agent:')) {
      agentContent = `## Agent: ${status.agentId}\n\n${agentContent}`;
    }
    
    content += `${agentContent.trim()}\n\n---\n\n`;
  }
  
  // Write the merged file
  return trySync(() => {
    fs.writeFileSync(PROJECT_STATUS_FILE, content);
    return true;
  }, false);
}

/**
 * Create a new agent status file
 * @param {string} agentId - Agent identifier
 * @param {string} content - Status content
 * @returns {Object} Result object with success flag and file path
 */
function createAgentStatus(agentId, content) {
  if (!agentId) {
    return { 
      success: false, 
      error: 'Agent ID is required'
    };
  }
  
  // Ensure status directory exists
  if (!pathUtils.pathExists(STATUS_DIR)) {
    const dirResult = pathUtils.ensureDir(STATUS_DIR);
    if (!dirResult) {
      return { 
        success: false, 
        error: `Failed to create status directory: ${STATUS_DIR}`
      };
    }
  }
  
  const statusFile = path.join(STATUS_DIR, `status-${agentId}.md`);
  
  // Write the status file
  const writeResult = trySync(() => {
    fs.writeFileSync(statusFile, content, 'utf8');
    return statusFile;
  });
  
  if (!writeResult.success) {
    return writeResult;
  }
  
  // Update the merged project status
  generateProjectStatus();
  
  return writeResult;
}

/**
 * Get all service specifications
 * @returns {Object} Result object with success flag and array of service specs
 */
function getServiceSpecs() {
  if (!pathUtils.pathExists(SERVICES_DIR)) {
    return { success: false, value: [], error: `Services directory not found: ${SERVICES_DIR}` };
  }
  
  return trySync(() => {
    const files = fs.readdirSync(SERVICES_DIR);
    const specs = [];
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = path.join(SERVICES_DIR, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Extract service name from filename
          const serviceName = file.replace(/\.md$/, '').replace(/-spec$/, '');
          
          specs.push({
            serviceName,
            path: filePath,
            relativePath: path.relative(pathUtils.PROJECT_ROOT, filePath),
            lastModified: stats.mtime,
            content
          });
        }
      } catch (err) {
        // Skip files we can't read
      }
    }
    
    return specs;
  }, []);
}

module.exports = {
  isServiceDirectory,
  getServices,
  detectServiceLanguage,
  readAgentStatusFiles,
  generateProjectStatus,
  createAgentStatus,
  getServiceSpecs,
  SERVICE_INDICATORS
};
