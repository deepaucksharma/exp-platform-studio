#!/usr/bin/env node

/**
 * Protocol Compressor for Claude Desktop
 * Generates hypercompressed protocol references with checksums
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const PROTOCOL_DIR = path.join(__dirname, '..', 'docs', 'protocol');
const OUTPUT_FILE = path.join(__dirname, 'protocol-refs.md');
const JSON_OUTPUT = path.join(__dirname, 'protocol-refs.json');

/**
 * Generate a short checksum for a string
 * @param {string} content - The content to hash
 * @returns {string} A short checksum (6 characters)
 */
function generateShortChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 6);
}

/**
 * Extract a short summary from content (first 50-100 chars that make sense)
 * @param {string} content - The content to summarize
 * @returns {string} A short summary
 */
function extractSummary(content) {
  // Look for the first heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    // Return the heading text (max 50 chars)
    return headingMatch[1].trim().substring(0, 50);
  }
  
  // Look for the first non-empty paragraph
  const paragraphs = content.split('\n\n');
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      // Return the first 100 chars of the paragraph
      return trimmed.replace(/\s+/g, ' ').substring(0, 100).trim();
    }
  }
  
  // Fallback: just take the first 100 non-empty chars
  return content.replace(/\s+/g, ' ').trim().substring(0, 100);
}

/**
 * Generate a protocol reference map
 */
function generateProtocolReferences() {
  if (!fs.existsSync(PROTOCOL_DIR)) {
    console.error(`Protocol directory not found: ${PROTOCOL_DIR}`);
    return null;
  }
  
  try {
    console.log(`Scanning protocol directory: ${PROTOCOL_DIR}`);
    
    const protocolFiles = fs.readdirSync(PROTOCOL_DIR)
      .filter(file => file.endsWith('.md'));
    
    if (protocolFiles.length === 0) {
      console.warn('No protocol files found');
      return null;
    }
    
    const protocols = [];
    
    for (const file of protocolFiles) {
      const filePath = path.join(PROTOCOL_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = generateShortChecksum(content);
      const id = path.basename(file, '.md').toUpperCase();
      
      // Extract a brief summary
      const summary = extractSummary(content);
      
      protocols.push({
        id,
        name: path.basename(file, '.md'),
        summary,
        checksum,
        path: filePath
      });
      
      console.log(`Processed ${file} -> ${id} [${checksum}]`);
    }
    
    return protocols;
  } catch (err) {
    console.error(`Error generating protocol references: ${err.message}`);
    return null;
  }
}

/**
 * Generate Markdown output
 * @param {Array} protocols - Array of protocol objects
 */
function generateMarkdownOutput(protocols) {
  const lines = [
    '# Protocol References [CPR-v1]',
    '',
    'Hypercompressed protocol references for Claude Desktop.',
    'Format: ID: summary [checksum]',
    '',
    '## Core Protocols',
    ''
  ];
  
  for (const protocol of protocols) {
    lines.push(`${protocol.id}: ${protocol.summary} [${protocol.checksum}]`);
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('To reference a protocol in conversation, use: §PROTOCOL_ID');
  lines.push('Example: "According to §SEP, we should keep implementation code separated."');
  
  return lines.join('\n');
}

/**
 * Main function
 */
function main() {
  console.log('DStudio Protocol Compressor for Claude Desktop');
  console.log('=============================================');
  
  // If protocol directory doesn't exist, create a sample one
  if (!fs.existsSync(PROTOCOL_DIR)) {
    console.log(`Creating sample protocol directory: ${PROTOCOL_DIR}`);
    fs.mkdirSync(PROTOCOL_DIR, { recursive: true });
    
    // Create a sample protocol file
    const sampleProtocolPath = path.join(PROTOCOL_DIR, 'separation.md');
    const sampleContent = `# Meta/Implementation Separation Protocol

This protocol defines the strict separation between meta and implementation layers.

## Rules

1. Meta layer code goes in the repository root
2. Implementation code goes in the \`generated_implementation\` directory
3. No implementation-specific code in meta layer
4. No meta-specific code in implementation layer

## Benefits

- Clear separation of concerns
- Easier to maintain and update
- Better organization
`;
    
    fs.writeFileSync(sampleProtocolPath, sampleContent);
    console.log(`Created sample protocol: ${sampleProtocolPath}`);
  }
  
  // Generate protocol references
  const protocols = generateProtocolReferences();
  
  if (!protocols || protocols.length === 0) {
    console.error('Failed to generate protocol references');
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate and write Markdown output
  const markdown = generateMarkdownOutput(protocols);
  fs.writeFileSync(OUTPUT_FILE, markdown);
  console.log(`Markdown output written to: ${OUTPUT_FILE}`);
  
  // Generate and write JSON output
  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(protocols, null, 2));
  console.log(`JSON output written to: ${JSON_OUTPUT}`);
  
  console.log(`Processed ${protocols.length} protocol files`);
}

// Run the main function
main();
