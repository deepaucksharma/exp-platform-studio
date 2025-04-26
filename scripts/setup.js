#!/usr/bin/env node

/**
 * DStudio Project Setup
 * Sets up the project structure and ensures all requirements are met
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Check if running in the correct directory
function checkProjectRoot() {
  console.log(chalk.blue('Checking project root...'));
  
  const configPath = path.join(process.cwd(), '.agent-config.json');
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('Error: Not in project root or .agent-config.json not found.'));
    console.log(chalk.yellow('Please run this script from the project root directory.'));
    process.exit(1);
  }
  
  console.log(chalk.green('✓ Project root verified.'));
}

// Check and install dependencies
function checkDependencies() {
  console.log(chalk.blue('\nChecking dependencies...'));
  
  try {
    console.log('Checking Node.js and npm...');
    const nodeVersion = execSync('node --version').toString().trim();
    const npmVersion = execSync('npm --version').toString().trim();
    
    console.log(chalk.green(`✓ Node.js ${nodeVersion}`));
    console.log(chalk.green(`✓ npm ${npmVersion}`));
    
    // Check if package.json exists
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      console.error(chalk.red('Error: package.json not found.'));
      process.exit(1);
    }
    
    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log(chalk.green('✓ Dependencies installed.'));
  } catch (error) {
    console.error(chalk.red('Error checking dependencies:'), error.message);
    process.exit(1);
  }
}

// Create necessary directories
function createDirectories() {
  console.log(chalk.blue('\nCreating necessary directories...'));
  
  // Load configuration
  let config;
  try {
    config = JSON.parse(fs.readFileSync('.agent-config.json', 'utf8'));
  } catch (error) {
    console.error(chalk.red('Error loading .agent-config.json:'), error.message);
    process.exit(1);
  }
  
  // Get implementation directory
  const implDir = config.workspace.implementationDir || './generated_implementation';
  
  const directories = [
    './docs',
    './docs/protocol',
    './docs/prompts',
    implDir,
    './.cache',
    './.cache/stale-locks',
    './.cache/diff-logs',
    './.cache/temp'
  ];
  
  for (const dir of directories) {
    const dirPath = path.resolve(dir);
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(chalk.green(`✓ Created ${dir}`));
      } catch (error) {
        console.error(chalk.red(`Error creating ${dir}:`), error.message);
      }
    } else {
      console.log(chalk.green(`✓ ${dir} already exists.`));
    }
  }
  
  // Create implementation GitHub workflow directory
  const implCIDir = path.join(implDir, '.github', 'workflows');
  if (!fs.existsSync(implCIDir)) {
    try {
      fs.mkdirSync(implCIDir, { recursive: true });
      console.log(chalk.green(`✓ Created ${implCIDir}`));
    } catch (error) {
      console.error(chalk.red(`Error creating ${implCIDir}:`), error.message);
    }
  }
}

// Run and check generators
function runGenerators() {
  console.log(chalk.blue('\nRunning generators...'));
  
  try {
    const generators = [
      { name: 'Layout Generator', script: 'scripts/gen-layout.js' },
      { name: 'Status Generator', script: 'scripts/gen-status-quick.js' }
    ];
    
    for (const generator of generators) {
      console.log(`Running ${generator.name}...`);
      execSync(`node ${generator.script}`, { stdio: 'inherit' });
      console.log(chalk.green(`✓ ${generator.name} completed.`));
    }
  } catch (error) {
    console.log(chalk.yellow('Warning: Some generators failed:'), error.message);
    console.log(chalk.yellow('This is expected for new projects with incomplete structure.'));
  }
}

// Run health check
function runHealthCheck() {
  console.log(chalk.blue('\nRunning health check...'));
  
  try {
    execSync('node scripts/health-check.js', { stdio: 'inherit' });
    console.log(chalk.green('✓ Health check passed.'));
  } catch (error) {
    console.log(chalk.yellow('Warning: Health check found issues.'));
    console.log(chalk.yellow('This is expected for new projects with incomplete structure.'));
  }
}

// Main function
function main() {
  console.log(chalk.yellow('DStudio Project Setup'));
  console.log(chalk.yellow('====================\n'));
  
  checkProjectRoot();
  checkDependencies();
  createDirectories();
  runGenerators();
  runHealthCheck();
  
  console.log(chalk.green('\nSetup complete! Your DStudio project is ready.'));
  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.blue('1. Add implementation-specific code to the generated_implementation/ directory'));
  console.log(chalk.blue('2. Update the implementation-specific CI workflow in generated_implementation/.github/workflows/'));
  console.log(chalk.blue('3. Run npm run health-check periodically to ensure proper structure'));
}

// Run main function
main();
