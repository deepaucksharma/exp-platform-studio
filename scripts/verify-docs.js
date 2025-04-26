#!/usr/bin/env node

/**
 * Documentation Link Verification Script
 * Checks for broken links within documentation files
 */

const fs = require('fs');
const path = require('path');
const utils = require('./config-utils');

const DOCS_DIR = path.join(utils.getAbsolutePath('./docs'));
const ROOT_DIR = utils.getAbsolutePath('./');
const README_REGEX = /README\.md$/i;
const MARKDOWN_REGEX = /\.md$/i;
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const HEADER_REGEX = /^#+\s+(.+)$/gm;
const HEADER_LINK_REGEX = /#([a-z0-9-]+)/;

// Tracks issues found
const issues = [];
const warnings = [];
const success = [];

/**
 * Check if a file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

/**
 * Get headers from markdown file
 * @param {string} content - Markdown content
 * @returns {string[]} Array of headers
 */
function getHeadersFromMarkdown(content) {
  const headers = [];
  let match;
  
  while ((match = HEADER_REGEX.exec(content)) !== null) {
    const header = match[1].trim();
    const slug = header
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    headers.push(slug);
  }
  
  return headers;
}

/**
 * Verify links in a markdown file
 * @param {string} filePath - Path to markdown file
 */
function verifyLinks(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const basePath = path.dirname(filePath);
    let match;
    
    while ((match = LINK_REGEX.exec(content)) !== null) {
      const linkText = match[1];
      const link = match[2];
      
      // Ignore external links and absolute URLs
      if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('mailto:')) {
        continue;
      }
      
      // Extract link and anchor
      let linkPath = link;
      let anchor = '';
      
      if (link.includes('#')) {
        [linkPath, anchor] = link.split('#', 2);
        anchor = `#${anchor}`;
      }
      
      // Handle empty links (links to the current file)
      if (linkPath === '') {
        linkPath = filePath;
      } else {
        // Resolve relative path
        linkPath = path.resolve(basePath, linkPath);
      }
      
      // Check if file exists
      if (!fileExists(linkPath)) {
        issues.push(`Broken link in ${filePath}: [${linkText}](${link}) - File not found: ${linkPath}`);
        continue;
      }
      
      // Check anchor if exists
      if (anchor && MARKDOWN_REGEX.test(linkPath)) {
        const targetContent = fs.readFileSync(linkPath, 'utf8');
        const headers = getHeadersFromMarkdown(targetContent);
        const anchorTarget = HEADER_LINK_REGEX.exec(anchor);
        
        if (anchorTarget && !headers.includes(anchorTarget[1])) {
          warnings.push(`Potential broken anchor in ${filePath}: [${linkText}](${link}) - Anchor not found: ${anchor}`);
        } else {
          success.push(`Valid link in ${filePath}: [${linkText}](${link})`);
        }
      } else {
        success.push(`Valid link in ${filePath}: [${linkText}](${link})`);
      }
    }
  } catch (err) {
    issues.push(`Error verifying links in ${filePath}: ${err.message}`);
  }
}

/**
 * Recursively scan for markdown files
 * @param {string} dirPath - Directory to scan
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      
      // Skip excluded directories
      if (utils.isExcludedDir(item)) {
        continue;
      }
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else if (MARKDOWN_REGEX.test(item)) {
          verifyLinks(itemPath);
        }
      } catch (err) {
        console.error(`Error scanning ${itemPath}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}: ${err.message}`);
  }
}

/**
 * Main function
 */
function main() {
  console.log('DStudio Documentation Verification');
  console.log('=================================\n');
  
  // Check main README first
  const mainReadme = path.join(ROOT_DIR, 'README.md');
  if (fileExists(mainReadme)) {
    console.log(`Checking main README.md...`);
    verifyLinks(mainReadme);
  }
  
  // Scan docs directory
  console.log(`\nScanning ${DOCS_DIR}...`);
  scanDirectory(DOCS_DIR);
  
  // Check implementation README if exists
  const implReadme = path.join(utils.getImplementationDir(), 'README.md');
  if (fileExists(implReadme)) {
    console.log(`\nChecking implementation README.md...`);
    verifyLinks(implReadme);
  }
  
  // Scan implementation templates READMEs
  const templatesDir = path.join(utils.getImplementationDir(), 'templates');
  if (fs.existsSync(templatesDir)) {
    console.log(`\nScanning templates...`);
    scanDirectory(templatesDir);
  }
  
  // Output results
  console.log('\nVerification Results:');
  console.log('=====================\n');
  
  if (issues.length > 0) {
    console.log(`Issues found (${issues.length}):`);
    issues.forEach(issue => console.log(`- ${issue}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    warnings.forEach(warning => console.log(`- ${warning}`));
    console.log('');
  }
  
  console.log(`Successful links: ${success.length}`);
  console.log(`Issues: ${issues.length}`);
  console.log(`Warnings: ${warnings.length}`);
  
  // Write report
  const report = `# Documentation Verification Report
Generated: ${new Date().toISOString()}

## Summary
- Successful links: ${success.length}
- Issues: ${issues.length}
- Warnings: ${warnings.length}

${issues.length > 0 ? `## Issues
${issues.map(issue => `- ${issue}`).join('\n')}` : ''}

${warnings.length > 0 ? `## Warnings
${warnings.map(warning => `- ${warning}`).join('\n')}` : ''}
`;

  fs.writeFileSync(path.join(ROOT_DIR, 'docs-verification-report.md'), report);
  console.log('\nReport written to docs-verification-report.md');
  
  // Exit with error code if issues found
  if (issues.length > 0) {
    process.exit(1);
  }
}

// Run main function
main();
