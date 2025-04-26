/**
 * DStudio Project Health Check
 * Verifies project structure, meta/implementation separation, and configuration consistency
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Load configuration
let config;
try {
  config = require('../.agent-config.json');
  console.log(chalk.green('✓ Successfully loaded .agent-config.json'));
} catch (err) {
  console.error(chalk.red('✗ Failed to load .agent-config.json:'), err.message);
  process.exit(1);
}

// Setup paths
const ROOT_DIR = path.resolve(config.workspace.rootDir || './');
const IMPL_DIR = path.resolve(config.workspace.implementationDir || './generated_implementation');
const META_FILES = [
  '.agent-config.json',
  'project-layout.json',
  'project-status.md',
  'spec.index.json',
  'status.quick.json',
  'CHANGES-SUMMARY.md',
  'README.md',
  'retrospective.md'
];

// Directories that should exist at root level
const EXPECTED_DIRS = [
  'scripts',
  'docs',
  'generated_implementation'
];

// Files that shouldn't be in the root (tech stack specific)
const TECH_STACK_FILES = [
  // Node/JS specific
  'node_modules',
  // Python specific
  'venv',
  '.venv',
  '__pycache__',
  // Go specific
  'vendor',
  // Java specific
  'target',
  'build',
  'gradle',
  '.gradle',
  // Rust specific
  'target',
  'Cargo.lock',
  // General build outputs
  'dist',
  'out',
  'bin',
  'obj'
];

// Results tracking
const issues = [];
const successes = [];

// Check if file is a meta file (should be in root)
function isMetaFile(file) {
  return META_FILES.includes(file) || 
         file.startsWith('.') || 
         file.startsWith('project-') ||
         EXPECTED_DIRS.includes(file);
}

// Check if file is an implementation file (should be in implementation dir)
function isTechStackFile(file) {
  return TECH_STACK_FILES.some(pattern => 
    file === pattern || file.endsWith(pattern) || file.startsWith(pattern)
  );
}

// Check directory structure
function checkDirectoryStructure() {
  console.log(chalk.blue('\nChecking directory structure...'));
  
  // Check expected directories exist
  for (const dir of EXPECTED_DIRS) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      successes.push(`✓ Expected directory ${dir} exists`);
    } else {
      issues.push(`✗ Expected directory ${dir} is missing`);
    }
  }
  
  // Check root directory for implementation files that shouldn't be there
  const rootFiles = fs.readdirSync(ROOT_DIR);
  for (const file of rootFiles) {
    // Special case for node_modules - it's allowed in root for meta layer dependencies
    // and in implementation for implementation dependencies
    if (file === 'node_modules' && fs.existsSync(path.join(ROOT_DIR, 'package.json'))) {
      // If there's a package.json in the root with a name containing 'meta', the node_modules is for meta layer
      const pkgJson = require(path.join(ROOT_DIR, 'package.json'));
      if (pkgJson.name && (pkgJson.name.includes('-meta') || pkgJson.name.includes('_meta'))) {
        successes.push(`✓ Root node_modules is for meta layer dependencies (associated with ${pkgJson.name})`);
        continue;
      }
    }
    
    if (isTechStackFile(file)) {
      issues.push(`✗ Tech stack specific file/dir "${file}" found in root directory - should be in ${config.workspace.implementationDir}`);
    }
  }
  
  // Validate package.json in root is for meta only
  const rootPkgPath = path.join(ROOT_DIR, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = require(rootPkgPath);
      if (!pkg.name.includes('-meta') && !pkg.name.includes('_meta')) {
        issues.push(`✗ Root package.json should be named with "-meta" suffix to clarify it's for the meta layer`);
      } else {
        successes.push(`✓ Root package.json correctly identified as meta layer`);
      }
    } catch (err) {
      issues.push(`✗ Could not parse root package.json: ${err.message}`);
    }
  }
}

// Check configuration consistency
function checkConfigConsistency() {
  console.log(chalk.blue('\nChecking configuration consistency...'));
  
  // Check if .github/workflows CI is implementation-aware
  const ciPath = path.join(ROOT_DIR, '.github', 'workflows', 'ci.yml');
  if (fs.existsSync(ciPath)) {
    const ciContent = fs.readFileSync(ciPath, 'utf8');
    
    if (ciContent.includes('cd generated_implementation') && 
        !ciContent.includes('${config.workspace.implementationDir}')) {
      issues.push(`✗ CI workflow has hardcoded implementation directory paths instead of using config values`);
    } else {
      successes.push(`✓ CI workflow appears to be using correct implementation paths`);
    }
  }
  
  // Check for language detection patterns consistency
  if (config.workspace.projectTypePatterns) {
    const patterns = config.workspace.projectTypePatterns;
    let valid = true;
    
    // All patterns should point to implementation directory
    for (const [lang, filePatterns] of Object.entries(patterns)) {
      for (const pattern of filePatterns) {
        if (!pattern.includes(config.workspace.implementationDir.replace('./', ''))) {
          issues.push(`✗ Project type pattern for ${lang} doesn't reference implementation directory: ${pattern}`);
          valid = false;
        }
      }
    }
    
    if (valid) {
      successes.push(`✓ Project type patterns correctly reference implementation directory`);
    }
  }
}

// Check script path references
function checkScriptPaths() {
  console.log(chalk.blue('\nChecking script paths...'));
  
  const scriptsDir = path.join(ROOT_DIR, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    issues.push(`✗ Scripts directory doesn't exist`);
    return;
  }
  
  const scriptFiles = fs.readdirSync(scriptsDir).filter(f => 
    f.endsWith('.js') || f.endsWith('.sh')
  );
  
  for (const scriptFile of scriptFiles) {
    const scriptPath = path.join(scriptsDir, scriptFile);
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Check for hardcoded paths
    if (content.includes('./generated_implementation/') && 
        !content.includes('config.workspace.implementationDir')) {
      issues.push(`✗ Script ${scriptFile} contains hardcoded implementation path`);
    }
    
    // Check for platform-specific commands in JS files
    if (scriptFile.endsWith('.js')) {
      // Look for platform-specific commands but exclude health-check.js itself
      if (scriptFile !== 'health-check.js') {
        const platformSpecificCommands = [
          { pattern: 'stat -c', message: 'Linux-specific stat command' },
          { pattern: 'stat -f', message: 'macOS-specific stat command' },
          { pattern: 'cmd.exe', message: 'Windows-specific command' },
          { pattern: 'powershell.exe', message: 'Windows-specific command' }
        ];
        
        for (const { pattern, message } of platformSpecificCommands) {
          if (content.includes(pattern)) {
            issues.push(`✗ Script ${scriptFile} contains platform-specific command: ${message}. Use Node.js fs module for cross-platform compatibility.`);
          }
        }
      }
    }
  }
  
  // Check for dependencies in scripts
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = require(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (!deps.minimatch && scriptFiles.some(f => {
        const content = fs.readFileSync(path.join(scriptsDir, f), 'utf8');
        return content.includes('minimatch') || content.includes('require("minimatch")');
      })) {
        issues.push(`✗ Scripts use minimatch but it's not in package.json dependencies`);
      }
    } catch (err) {
      issues.push(`✗ Could not check package.json dependencies: ${err.message}`);
    }
  }
}

// Main health check function
function runHealthCheck() {
  console.log(chalk.yellow('DStudio Project Health Check'));
  console.log(chalk.yellow('========================='));
  
  checkDirectoryStructure();
  checkConfigConsistency();
  checkScriptPaths();
  
  // Output results
  console.log(chalk.blue('\nHealth Check Results:'));
  console.log(chalk.blue('===================='));
  
  if (successes.length > 0) {
    console.log(chalk.green('\nSuccesses:'));
    successes.forEach(msg => console.log(chalk.green(msg)));
  }
  
  if (issues.length > 0) {
    console.log(chalk.red('\nIssues:'));
    issues.forEach(msg => console.log(chalk.red(msg)));
  } else {
    console.log(chalk.green('\nNo issues found. Project structure looks good!'));
  }
  
  // Write report
  const report = `# DStudio Health Check Report
Generated: ${new Date().toISOString()}

## Successes
${successes.map(s => '- ' + s.replace('✓ ', '')).join('\n')}

${issues.length > 0 ? `## Issues
${issues.map(i => '- ' + i.replace('✗ ', '')).join('\n')}` : '## No Issues Found!'}
`;

  fs.writeFileSync(path.join(ROOT_DIR, 'health-check-report.md'), report);
  console.log(chalk.blue('\nReport written to health-check-report.md'));
  
  // Exit with error code if issues found
  if (issues.length > 0) {
    console.log(chalk.yellow(`\nFound ${issues.length} issue(s) to fix.`));
    process.exit(1);
  }
}

runHealthCheck();
