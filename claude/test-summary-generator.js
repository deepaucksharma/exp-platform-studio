#!/usr/bin/env node

/**
 * Structured Test Summary Generator for Claude Desktop
 * Creates concise, scannable test result summaries
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const IMPL_DIR = path.join(ROOT_DIR, 'generated_implementation');
const OUTPUT_DIR = path.join(__dirname, 'test-summaries');

/**
 * Run tests for a JavaScript service
 * @param {string} servicePath - Path to the service
 * @returns {Object} Test results
 */
function runJsTests(servicePath) {
  const result = {
    success: false,
    output: '',
    summary: {
      pass: 0,
      fail: 0,
      skip: 0,
      coverage: 'N/A',
      failures: []
    }
  };
  
  try {
    // Check if package.json exists
    const packageJsonPath = path.join(servicePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      result.output = 'No package.json found';
      return result;
    }
    
    // Check if test script exists
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.scripts || !packageJson.scripts.test) {
      result.output = 'No test script found in package.json';
      return result;
    }
    
    // Run tests with Jest if available (captures more details)
    try {
      const hasJest = packageJson.dependencies?.jest || packageJson.devDependencies?.jest;
      
      if (hasJest) {
        // Run Jest with JSON output
        const output = execSync('npx jest --json', {
          cwd: servicePath,
          timeout: 30000,
          encoding: 'utf8'
        });
        
        // Parse JSON output
        const testResults = JSON.parse(output);
        
        result.success = testResults.success;
        result.summary.pass = testResults.numPassedTests;
        result.summary.fail = testResults.numFailedTests;
        result.summary.skip = testResults.numPendingTests;
        
        // Get coverage if available
        if (testResults.coverageMap) {
          const covSummary = testResults.coverageMap.getCoverageSummary();
          result.summary.coverage = `${covSummary.lines.pct}%`;
        }
        
        // Get failures
        for (const testResult of testResults.testResults) {
          for (const assertionResult of testResult.assertionResults) {
            if (assertionResult.status === 'failed') {
              result.summary.failures.push({
                name: assertionResult.fullName || assertionResult.title,
                file: path.relative(servicePath, testResult.testFilePath),
                message: assertionResult.failureMessages[0]?.split('\n')[0] || 'Unknown error'
              });
            }
          }
        }
      } else {
        // Fallback to npm test
        const output = execSync('npm test', {
          cwd: servicePath,
          timeout: 30000,
          encoding: 'utf8'
        });
        
        result.success = true;
        result.output = output;
        
        // Very basic parsing of npm test output
        const passMatch = output.match(/(\d+)\s+passing/i);
        const failMatch = output.match(/(\d+)\s+failing/i);
        const skipMatch = output.match(/(\d+)\s+skipped/i);
        
        if (passMatch) result.summary.pass = parseInt(passMatch[1], 10);
        if (failMatch) result.summary.fail = parseInt(failMatch[1], 10);
        if (skipMatch) result.summary.skip = parseInt(skipMatch[1], 10);
        
        result.success = result.summary.fail === 0;
      }
    } catch (error) {
      result.success = false;
      result.output = error.stdout?.toString() || error.message;
      
      // Basic parsing of error output
      const passMatch = result.output.match(/(\d+)\s+passing/i);
      const failMatch = result.output.match(/(\d+)\s+failing/i);
      const skipMatch = result.output.match(/(\d+)\s+skipped/i);
      
      if (passMatch) result.summary.pass = parseInt(passMatch[1], 10);
      if (failMatch) result.summary.fail = parseInt(failMatch[1], 10);
      if (skipMatch) result.summary.skip = parseInt(skipMatch[1], 10);
      
      // Extract failure details from stdout
      const failureBlocks = result.output.split('failing').slice(1);
      for (const block of failureBlocks) {
        const testLines = block.split('\n').filter(line => line.trim().startsWith('✖')).slice(0, 5);
        for (const line of testLines) {
          const cleanLine = line.replace(/✖|×/g, '').trim();
          result.summary.failures.push({
            name: cleanLine,
            file: 'Unknown',
            message: 'Test failed'
          });
        }
      }
    }
  } catch (err) {
    result.output = `Error running tests: ${err.message}`;
  }
  
  return result;
}

/**
 * Run tests for a Python service
 * @param {string} servicePath - Path to the service
 * @returns {Object} Test results
 */
function runPythonTests(servicePath) {
  const result = {
    success: false,
    output: '',
    summary: {
      pass: 0,
      fail: 0,
      skip: 0,
      coverage: 'N/A',
      failures: []
    }
  };
  
  try {
    // Check if pytest is installable
    try {
      execSync('pip show pytest', {
        cwd: servicePath,
        timeout: 5000
      });
    } catch (err) {
      result.output = 'pytest not found';
      return result;
    }
    
    // Run tests with pytest
    try {
      // Run pytest with JUnit XML output for better parsing
      const tempXmlPath = path.join(servicePath, 'test-results.xml');
      execSync(`python -m pytest -v --junitxml=${tempXmlPath}`, {
        cwd: servicePath,
        timeout: 30000
      });
      
      // Parse XML output if available
      if (fs.existsSync(tempXmlPath)) {
        const xmlContent = fs.readFileSync(tempXmlPath, 'utf8');
        
        // Very basic XML parsing (a real implementation would use a proper XML parser)
        const testsMatch = xmlContent.match(/tests="(\d+)"/);
        const failuresMatch = xmlContent.match(/failures="(\d+)"/);
        const skippedMatch = xmlContent.match(/skipped="(\d+)"/);
        
        if (testsMatch) {
          const totalTests = parseInt(testsMatch[1], 10);
          const failures = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
          const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
          
          result.summary.pass = totalTests - failures - skipped;
          result.summary.fail = failures;
          result.summary.skip = skipped;
          result.success = failures === 0;
        }
        
        // Clean up temp file
        fs.unlinkSync(tempXmlPath);
      }
    } catch (error) {
      result.success = false;
      result.output = error.stdout?.toString() || error.message;
      
      // Try to parse pytest output
      const passMatch = result.output.match(/(\d+)\s+passed/i);
      const failMatch = result.output.match(/(\d+)\s+failed/i);
      const skipMatch = result.output.match(/(\d+)\s+skipped/i);
      
      if (passMatch) result.summary.pass = parseInt(passMatch[1], 10);
      if (failMatch) result.summary.fail = parseInt(failMatch[1], 10);
      if (skipMatch) result.summary.skip = parseInt(skipMatch[1], 10);
      
      // Extract failure details
      const lines = result.output.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('FAILED')) {
          const fileMatch = line.match(/([^:]+)::\w+/);
          if (fileMatch) {
            const testName = line.trim();
            result.summary.failures.push({
              name: testName,
              file: fileMatch[1],
              message: i + 1 < lines.length ? lines[i + 1].trim() : 'Unknown error'
            });
          }
        }
      }
    }
    
    // Try to get coverage if pytest-cov is available
    try {
      const coverageOutput = execSync('python -m pytest --cov=.', {
        cwd: servicePath,
        timeout: 30000,
        encoding: 'utf8'
      });
      
      const coverageMatch = coverageOutput.match(/TOTAL\s+[\d\s\-]+(\d+%)/);
      if (coverageMatch) {
        result.summary.coverage = coverageMatch[1];
      }
    } catch (err) {
      // Ignore coverage errors
    }
  } catch (err) {
    result.output = `Error running tests: ${err.message}`;
  }
  
  return result;
}

/**
 * Run tests for a Go service
 * @param {string} servicePath - Path to the service
 * @returns {Object} Test results
 */
function runGoTests(servicePath) {
  const result = {
    success: false,
    output: '',
    summary: {
      pass: 0,
      fail: 0,
      skip: 0,
      coverage: 'N/A',
      failures: []
    }
  };
  
  try {
    // Check if go.mod exists
    if (!fs.existsSync(path.join(servicePath, 'go.mod'))) {
      result.output = 'No go.mod found';
      return result;
    }
    
    // Run tests with coverage
    try {
      // Use -json for better parsing
      const output = execSync('go test ./... -json -cover', {
        cwd: servicePath,
        timeout: 30000,
        encoding: 'utf8'
      });
      
      // Parse JSON output (one JSON object per line)
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const testResult = JSON.parse(line);
          
          if (testResult.Action === 'pass') {
            result.summary.pass++;
          } else if (testResult.Action === 'fail') {
            result.summary.fail++;
            
            result.summary.failures.push({
              name: testResult.Test,
              file: testResult.Package,
              message: testResult.Output?.[0] || 'Test failed'
            });
          } else if (testResult.Action === 'skip') {
            result.summary.skip++;
          }
          
          // Extract coverage if available
          if (testResult.Action === 'output' && testResult.Output?.includes('coverage:')) {
            const coverageMatch = testResult.Output.match(/coverage:\s+(\d+\.\d+)%/);
            if (coverageMatch) {
              result.summary.coverage = `${coverageMatch[1]}%`;
            }
          }
        } catch (err) {
          // Skip lines that aren't valid JSON
        }
      }
      
      result.success = result.summary.fail === 0;
    } catch (error) {
      result.success = false;
      result.output = error.stdout?.toString() || error.message;
      
      // Try to parse error output
      const lines = result.output.split('\n');
      let inFailureBlock = false;
      let currentTest = null;
      
      for (const line of lines) {
        // Look for test failures
        if (line.includes('--- FAIL:')) {
          inFailureBlock = true;
          currentTest = line.split('--- FAIL:')[1].trim();
          continue;
        }
        
        if (inFailureBlock && line.includes('FAIL')) {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            result.summary.failures.push({
              name: currentTest,
              file: parts[0].trim(),
              message: parts.length > 2 ? parts[1].trim() : 'Test failed'
            });
          }
          inFailureBlock = false;
          currentTest = null;
        }
      }
      
      // Count total tests
      const passMatches = result.output.match(/--- PASS: /g);
      const failMatches = result.output.match(/--- FAIL: /g);
      const skipMatches = result.output.match(/--- SKIP: /g);
      
      result.summary.pass = passMatches ? passMatches.length : 0;
      result.summary.fail = failMatches ? failMatches.length : 0;
      result.summary.skip = skipMatches ? skipMatches.length : 0;
      
      // Extract coverage if available
      const coverageMatch = result.output.match(/coverage:\s+(\d+\.\d+)%/);
      if (coverageMatch) {
        result.summary.coverage = `${coverageMatch[1]}%`;
      }
    }
  } catch (err) {
    result.output = `Error running tests: ${err.message}`;
  }
  
  return result;
}

/**
 * Determine the type of a service
 * @param {string} servicePath - Path to the service
 * @returns {string} Service type (js, python, go, etc.)
 */
function getServiceType(servicePath) {
  if (fs.existsSync(path.join(servicePath, 'package.json'))) {
    return 'js';
  } else if (fs.existsSync(path.join(servicePath, 'requirements.txt')) || 
             fs.existsSync(path.join(servicePath, 'pyproject.toml'))) {
    return 'python';
  } else if (fs.existsSync(path.join(servicePath, 'go.mod'))) {
    return 'go';
  } else if (fs.existsSync(path.join(servicePath, 'Cargo.toml'))) {
    return 'rust';
  } else if (fs.existsSync(path.join(servicePath, 'pom.xml')) ||
             fs.existsSync(path.join(servicePath, 'build.gradle'))) {
    return 'java';
  } else {
    return 'unknown';
  }
}

/**
 * Run tests for a service
 * @param {string} serviceName - Name of the service
 * @returns {Object} Test results
 */
function runTests(serviceName) {
  const servicePath = path.join(IMPL_DIR, serviceName);
  
  if (!fs.existsSync(servicePath)) {
    return {
      success: false,
      output: `Service '${serviceName}' not found`,
      summary: {
        pass: 0,
        fail: 0,
        skip: 0,
        coverage: 'N/A',
        failures: []
      }
    };
  }
  
  console.log(`Running tests for service: ${serviceName}`);
  
  // Determine the service type
  const serviceType = getServiceType(servicePath);
  
  console.log(`Detected service type: ${serviceType}`);
  
  // Run tests based on service type
  switch (serviceType) {
    case 'js':
      return runJsTests(servicePath);
    case 'python':
      return runPythonTests(servicePath);
    case 'go':
      return runGoTests(servicePath);
    case 'rust':
      // Basic placeholder, would need Rust-specific testing implementation
      return {
        success: false,
        output: 'Rust testing not yet implemented',
        summary: {
          pass: 0,
          fail: 0,
          skip: 0,
          coverage: 'N/A',
          failures: []
        }
      };
    case 'java':
      // Basic placeholder, would need Java-specific testing implementation
      return {
        success: false,
        output: 'Java testing not yet implemented',
        summary: {
          pass: 0,
          fail: 0,
          skip: 0,
          coverage: 'N/A',
          failures: []
        }
      };
    default:
      return {
        success: false,
        output: `Unknown service type: ${serviceType}`,
        summary: {
          pass: 0,
          fail: 0,
          skip: 0,
          coverage: 'N/A',
          failures: []
        }
      };
  }
}

/**
 * Generate a formatted test summary for a service
 * @param {string} serviceName - Name of the service
 * @param {Object} testResults - Test results object
 * @returns {string} Formatted Markdown summary
 */
function generateTestSummary(serviceName, testResults) {
  const lines = [
    `# Test Summary: ${serviceName} [CTS-v1]`,
    '',
    'Structured test results optimized for Claude Desktop.',
    ''
  ];
  
  // Add service type
  const servicePath = path.join(IMPL_DIR, serviceName);
  const serviceType = getServiceType(servicePath);
  
  lines.push(`SERVICE: ${serviceName}`);
  lines.push(`TYPE: ${serviceType}`);
  lines.push(`STATUS: ${testResults.success ? 'PASS' : 'FAIL'}`);
  lines.push(`PASS: ${testResults.summary.pass} FAIL: ${testResults.summary.fail} SKIP: ${testResults.summary.skip}`);
  lines.push(`COVERAGE: ${testResults.summary.coverage}`);
  lines.push('');
  
  // Add failure details if any
  if (testResults.summary.failures.length > 0) {
    lines.push('## FAILURES');
    lines.push('');
    
    for (let i = 0; i < testResults.summary.failures.length; i++) {
      const failure = testResults.summary.failures[i];
      lines.push(`${i + 1}. ${failure.name} - ${failure.file} - ${failure.message}`);
    }
    
    lines.push('');
  }
  
  // Add test output excerpt
  if (testResults.output) {
    lines.push('## Output Excerpt');
    lines.push('');
    lines.push('```');
    
    // Limit output to first 20 lines
    const outputLines = testResults.output.split('\n').slice(0, 20);
    lines.push(outputLines.join('\n'));
    
    if (testResults.output.split('\n').length > 20) {
      lines.push('... (output truncated)');
    }
    
    lines.push('```');
  }
  
  return lines.join('\n');
}

/**
 * Generate test summaries for all services
 */
function generateAllTestSummaries() {
  // Find all services
  const services = findServices();
  
  if (services.length === 0) {
    console.log('No services found');
    return;
  }
  
  console.log(`Found ${services.length} services`);
  
  // Generate test summaries for each service
  const summaries = [];
  
  for (const service of services) {
    const testResults = runTests(service);
    const summary = generateTestSummary(service, testResults);
    
    fs.writeFileSync(path.join(OUTPUT_DIR, `${service}.md`), summary);
    console.log(`Test summary for ${service} written to: ${path.join(OUTPUT_DIR, `${service}.md`)}`);
    
    summaries.push({
      service,
      success: testResults.success,
      results: testResults.summary
    });
  }
  
  // Generate an index file
  const indexLines = [
    '# Test Summaries Index',
    '',
    'Test results for all services:',
    ''
  ];
  
  for (const summary of summaries) {
    const status = summary.success ? '✅' : '❌';
    indexLines.push(`- ${status} [${summary.service}](./${summary.service}.md) - Pass: ${summary.results.pass}, Fail: ${summary.results.fail}, Coverage: ${summary.results.coverage}`);
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.md'), indexLines.join('\n'));
  console.log(`Index written to: ${path.join(OUTPUT_DIR, 'index.md')}`);
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
function main() {
  console.log('DStudio Test Summary Generator');
  console.log('=============================');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Generate test summaries
  generateAllTestSummaries();
  
  console.log('Test summary generation complete!');
}

// Run the main function
main();
