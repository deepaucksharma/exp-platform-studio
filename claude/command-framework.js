/**
 * DStudio Claude Desktop Command Framework
 * Provides a unified command processing system for Claude Desktop integration
 */

const fs = require('fs');
const path = require('path');
const utils = require('../utils');

/**
 * Command patterns with regex matching
 * These patterns are used to identify and parse commands in user input
 */
const COMMAND_PATTERNS = {
  // Basic file operations
  '@file': /^@file\s+(\S+)$/,
  '@find': /^@find\s+(\S+)$/,
  '@search': /^@search\s+(.+)$/,
  
  // Project navigation
  '@map': /^@map(?:\s+(\S+))?$/,
  '@service': /^@service\s+(\S+)$/,
  '@structure': /^@structure(?:\s+(\S+))?$/,
  
  // Code understanding
  '@explain': /^@explain\s+(\S+)$/,
  '@function': /^@function\s+(\S+)$/,
  '@doc': /^@doc\s+(\S+)$/,
  
  // Testing and analysis
  '@test': /^@test\s+(\S+)$/,
  '@summary': /^@summary\s+(\S+)$/,
  '@health': /^@health(?:\s+(\S+))?$/,
  
  // Specialized views
  '@view': /^@view\s+(\S+)(?:\s+(.+))?$/,
  '@diagram': /^@diagram\s+(\S+)(?:\s+(.+))?$/,
  '@compare': /^@compare\s+(\S+)\s+(\S+)$/
};

/**
 * Command Processor for Claude Desktop
 * Processes and executes commands from user input
 */
class CommandProcessor {
  /**
   * Create a new Command Processor instance
   * @param {NavigationHub} navigationHub - Navigation hub instance
   * @param {MemoryManager} memoryManager - Memory manager instance
   */
  constructor(navigationHub, memoryManager) {
    this.navigationHub = navigationHub;
    this.memoryManager = memoryManager;
    this.commands = new Map();
    
    // Register command handlers
    this.registerCommands();
  }
  
  /**
   * Register command handlers
   */
  registerCommands() {
    // Register each command with its handler
    this.commands.set('@file', this.handleFileCommand.bind(this));
    this.commands.set('@find', this.handleFindCommand.bind(this));
    this.commands.set('@search', this.handleSearchCommand.bind(this));
    this.commands.set('@map', this.handleMapCommand.bind(this));
    this.commands.set('@service', this.handleServiceCommand.bind(this));
    this.commands.set('@structure', this.handleStructureCommand.bind(this));
    this.commands.set('@explain', this.handleExplainCommand.bind(this));
    this.commands.set('@function', this.handleFunctionCommand.bind(this));
    this.commands.set('@doc', this.handleDocCommand.bind(this));
    this.commands.set('@test', this.handleTestCommand.bind(this));
    this.commands.set('@summary', this.handleSummaryCommand.bind(this));
    this.commands.set('@health', this.handleHealthCommand.bind(this));
    this.commands.set('@view', this.handleViewCommand.bind(this));
    this.commands.set('@diagram', this.handleDiagramCommand.bind(this));
    this.commands.set('@compare', this.handleCompareCommand.bind(this));
  }
  
  /**
   * Process a command string
   * @param {string} command - Command string
   * @returns {Promise<Object>} Command result
   */
  async processCommand(command) {
    console.log(`Processing command: ${command}`);
    
    try {
      // Match command against patterns
      for (const [cmdName, pattern] of Object.entries(COMMAND_PATTERNS)) {
        const match = command.match(pattern);
        if (match) {
          // Found matching command, execute the handler
          const handler = this.commands.get(cmdName);
          if (handler) {
            // Record command in conversation memory
            await this.memoryManager.recordConversationEvent({
              type: 'command',
              command: cmdName,
              arguments: match.slice(1)
            });
            
            // Execute command and return result
            const result = await handler(match.slice(1));
            
            // Add command execution to navigation hub history
            await this.navigationHub.addHistoryEvent('commandExecution', {
              command: cmdName,
              arguments: match.slice(1),
              success: result.type !== 'error'
            });
            
            return result;
          }
        }
      }
      
      // No matching command found
      return {
        type: 'error',
        message: `Unknown command: ${command}`,
        hint: 'Use @help to see available commands'
      };
    } catch (err) {
      console.error(`Error processing command: ${err}`);
      return {
        type: 'error',
        message: `Failed to process command: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @file command - Show file contents
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleFileCommand([filePath]) {
    console.log(`Handling @file command for: ${filePath}`);
    
    try {
      const resolvedPath = this.resolvePath(filePath);
      const result = await utils.file.readFile(resolvedPath);
      
      if (result.success) {
        return {
          type: 'file',
          path: filePath,
          resolvedPath,
          content: result.value,
          // Simple extension-based file type detection
          fileType: path.extname(filePath).substring(1).toLowerCase() || 'txt'
        };
      } else {
        return {
          type: 'error',
          message: `Could not read file: ${filePath} - ${result.error?.message}`
        };
      }
    } catch (err) {
      console.error(`Error handling @file command: ${err}`);
      return {
        type: 'error',
        message: `Failed to read file: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @find command - Find files by name pattern
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleFindCommand([pattern]) {
    console.log(`Handling @find command for pattern: ${pattern}`);
    
    try {
      // Get project root
      const projectRoot = path.join(__dirname, '..');
      
      // Create pattern matcher
      const patternLower = pattern.toLowerCase();
      const matchFn = (filename) => filename.toLowerCase().includes(patternLower);
      
      // Find matching files
      const matches = [];
      await this.findFiles(projectRoot, matchFn, matches);
      
      if (matches.length > 0) {
        return {
          type: 'fileList',
          pattern,
          matches: matches.map(file => ({
            path: path.relative(projectRoot, file),
            name: path.basename(file)
          }))
        };
      } else {
        return {
          type: 'info',
          message: `No files matching '${pattern}' were found.`
        };
      }
    } catch (err) {
      console.error(`Error handling @find command: ${err}`);
      return {
        type: 'error',
        message: `Failed to find files: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @search command - Search for text in files
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleSearchCommand([query]) {
    console.log(`Handling @search command for query: ${query}`);
    
    try {
      // Get project root
      const projectRoot = path.join(__dirname, '..');
      
      // Search in files (exclude node_modules, .git)
      const matches = [];
      await this.searchInFiles(projectRoot, query, matches);
      
      if (matches.length > 0) {
        return {
          type: 'searchResults',
          query,
          matches
        };
      } else {
        return {
          type: 'info',
          message: `No results found for search query: '${query}'`
        };
      }
    } catch (err) {
      console.error(`Error handling @search command: ${err}`);
      return {
        type: 'error',
        message: `Failed to search files: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @map command - Show project map
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleMapCommand([scope]) {
    console.log(`Handling @map command with scope: ${scope || 'all'}`);
    
    try {
      // Get project map from navigation hub
      const projectMap = this.navigationHub.projectMap;
      if (!projectMap) {
        return {
          type: 'error',
          message: 'Project map not available. Navigation hub may not be initialized properly.'
        };
      }
      
      // Filter map based on scope
      let result;
      if (!scope || scope === 'all') {
        result = {
          type: 'projectMap',
          meta: projectMap.meta,
          implementation: projectMap.implementation
        };
      } else if (scope === 'meta') {
        result = {
          type: 'projectMap',
          scope: 'meta',
          map: projectMap.meta
        };
      } else if (scope === 'implementation') {
        result = {
          type: 'projectMap',
          scope: 'implementation',
          map: projectMap.implementation
        };
      } else {
        // Assume scope is a directory name
        const metaDir = projectMap.meta.directories.find(dir => dir.name === scope);
        const implDir = projectMap.implementation.directories.find(dir => dir.name === scope);
        
        if (metaDir) {
          result = {
            type: 'projectMap',
            scope: `meta/${scope}`,
            map: metaDir
          };
        } else if (implDir) {
          result = {
            type: 'projectMap',
            scope: `implementation/${scope}`,
            map: implDir
          };
        } else {
          return {
            type: 'error',
            message: `Directory not found: ${scope}`
          };
        }
      }
      
      return result;
    } catch (err) {
      console.error(`Error handling @map command: ${err}`);
      return {
        type: 'error',
        message: `Failed to generate project map: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @service command - Show service details
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleServiceCommand([serviceName]) {
    console.log(`Handling @service command for: ${serviceName}`);
    
    try {
      // Check if service exists in implementation
      const projectMap = this.navigationHub.projectMap;
      if (!projectMap || !projectMap.implementation) {
        return {
          type: 'error',
          message: 'Project map not available. Navigation hub may not be initialized properly.'
        };
      }
      
      const service = projectMap.implementation.directories.find(dir => dir.name === serviceName);
      if (!service) {
        return {
          type: 'error',
          message: `Service not found: ${serviceName}`
        };
      }
      
      // Generate service details
      return {
        type: 'serviceDetails',
        name: serviceName,
        structure: service,
        files: this.flattenFiles(service)
      };
    } catch (err) {
      console.error(`Error handling @service command: ${err}`);
      return {
        type: 'error',
        message: `Failed to get service details: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @structure command - Show structure details
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleStructureCommand([path]) {
    console.log(`Handling @structure command for: ${path || 'root'}`);
    
    try {
      // If no path provided, show top-level structure
      if (!path) {
        return {
          type: 'structure',
          meta: {
            directories: this.navigationHub.projectMap.meta.directories.map(dir => dir.name),
            files: this.navigationHub.projectMap.meta.files.map(file => file.name)
          },
          implementation: {
            directories: this.navigationHub.projectMap.implementation.directories.map(dir => dir.name),
            files: this.navigationHub.projectMap.implementation.files.map(file => file.name)
          }
        };
      }
      
      // Resolve path to directory
      const resolvedPath = this.resolvePath(path);
      if (!fs.existsSync(resolvedPath)) {
        return {
          type: 'error',
          message: `Path not found: ${path}`
        };
      }
      
      // Check if it's a directory
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return {
          type: 'error',
          message: `Not a directory: ${path}`
        };
      }
      
      // Scan directory
      const structure = this.scanDirectory(resolvedPath);
      
      return {
        type: 'structure',
        path,
        directories: structure.directories.map(dir => dir.name),
        files: structure.files.map(file => file.name)
      };
    } catch (err) {
      console.error(`Error handling @structure command: ${err}`);
      return {
        type: 'error',
        message: `Failed to get structure: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @explain command - Explain code/component
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleExplainCommand([target]) {
    console.log(`Handling @explain command for: ${target}`);
    
    try {
      // Check if target is a file
      if (target.includes('.')) {
        // Assume it's a file path
        return await this.explainFile(target);
      } else {
        // Assume it's a component/concept name
        return await this.explainConcept(target);
      }
    } catch (err) {
      console.error(`Error handling @explain command: ${err}`);
      return {
        type: 'error',
        message: `Failed to explain: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @function command - Show function details
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleFunctionCommand([functionName]) {
    console.log(`Handling @function command for: ${functionName}`);
    
    try {
      // Search for function in code map
      // For this implementation, we'll just find files that might contain the function
      const projectRoot = path.join(__dirname, '..');
      const matches = [];
      
      // Search for the function name in js files
      await this.searchInFiles(projectRoot, functionName, matches, ['.js']);
      
      if (matches.length > 0) {
        return {
          type: 'functionMatches',
          function: functionName,
          matches
        };
      } else {
        return {
          type: 'info',
          message: `No function found with name: ${functionName}`
        };
      }
    } catch (err) {
      console.error(`Error handling @function command: ${err}`);
      return {
        type: 'error',
        message: `Failed to find function: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @doc command - Show documentation
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleDocCommand([docPath]) {
    console.log(`Handling @doc command for: ${docPath}`);
    
    try {
      // If docPath is a directory, list markdown files
      const resolvedPath = this.resolvePath(docPath, 'docs');
      
      if (fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        
        if (stats.isDirectory()) {
          // List markdown files in directory
          const files = fs.readdirSync(resolvedPath)
            .filter(file => file.endsWith('.md'))
            .map(file => ({
              name: file,
              path: path.join(docPath, file)
            }));
          
          return {
            type: 'docList',
            path: docPath,
            documents: files
          };
        } else if (stats.isFile()) {
          // Read documentation file
          const content = fs.readFileSync(resolvedPath, 'utf8');
          
          return {
            type: 'document',
            path: docPath,
            content
          };
        }
      }
      
      // If we get here, the doc wasn't found
      return {
        type: 'error',
        message: `Documentation not found: ${docPath}`
      };
    } catch (err) {
      console.error(`Error handling @doc command: ${err}`);
      return {
        type: 'error',
        message: `Failed to get documentation: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @test command - Show test details
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleTestCommand([testPath]) {
    console.log(`Handling @test command for: ${testPath}`);
    
    try {
      // Resolve test path
      const resolvedPath = this.resolvePath(testPath);
      
      // Check if it's a test file or directory
      if (!fs.existsSync(resolvedPath)) {
        return {
          type: 'error',
          message: `Test path not found: ${testPath}`
        };
      }
      
      const stats = fs.statSync(resolvedPath);
      
      if (stats.isDirectory()) {
        // Find test files in directory
        const testFiles = [];
        await this.findFiles(resolvedPath, file => 
          file.endsWith('.test.js') || 
          file.endsWith('.spec.js') || 
          file.includes('/test/'),
          testFiles
        );
        
        return {
          type: 'testList',
          path: testPath,
          tests: testFiles.map(file => ({
            path: path.relative(path.join(__dirname, '..'), file),
            name: path.basename(file)
          }))
        };
      } else if (stats.isFile()) {
        // Read test file
        const result = await utils.file.readFile(resolvedPath);
        
        if (result.success) {
          return {
            type: 'testFile',
            path: testPath,
            content: result.value
          };
        } else {
          return {
            type: 'error',
            message: `Could not read test file: ${testPath} - ${result.error?.message}`
          };
        }
      }
      
      return {
        type: 'error',
        message: `Invalid test path: ${testPath}`
      };
    } catch (err) {
      console.error(`Error handling @test command: ${err}`);
      return {
        type: 'error',
        message: `Failed to get test details: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @summary command - Generate summary
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleSummaryCommand([target]) {
    console.log(`Handling @summary command for: ${target}`);
    
    try {
      if (target === 'memory') {
        // Generate memory summary
        const recentFiles = this.memoryManager.getReferencedFiles();
        const recentHistory = this.memoryManager.getRecentHistory(10);
        
        return {
          type: 'memorySummary',
          recentFiles,
          recentHistory,
          sessionInfo: this.memoryManager.shortTermMemory.get('session:info')
        };
      } else if (target === 'project') {
        // Generate project summary
        const metaCount = this.countFiles(this.navigationHub.projectMap.meta);
        const implCount = this.countFiles(this.navigationHub.projectMap.implementation);
        
        return {
          type: 'projectSummary',
          meta: {
            directories: this.navigationHub.projectMap.meta.directories.length,
            files: metaCount,
            topLevelDirectories: this.navigationHub.projectMap.meta.directories.map(dir => dir.name)
          },
          implementation: {
            directories: this.navigationHub.projectMap.implementation.directories.length,
            files: implCount,
            services: this.navigationHub.projectMap.implementation.directories.map(dir => dir.name)
          }
        };
      } else {
        // Generate summary for specific path
        const resolvedPath = this.resolvePath(target);
        
        if (!fs.existsSync(resolvedPath)) {
          return {
            type: 'error',
            message: `Path not found: ${target}`
          };
        }
        
        const stats = fs.statSync(resolvedPath);
        
        if (stats.isDirectory()) {
          // Directory summary
          const structure = this.scanDirectory(resolvedPath);
          const fileCount = this.countFiles(structure);
          
          return {
            type: 'directorySummary',
            path: target,
            directories: structure.directories.length,
            files: fileCount,
            topLevel: {
              directories: structure.directories.map(dir => dir.name),
              files: structure.files.map(file => file.name)
            }
          };
        } else if (stats.isFile()) {
          // File summary
          return await this.summarizeFile(resolvedPath);
        }
      }
      
      return {
        type: 'error',
        message: `Cannot generate summary for: ${target}`
      };
    } catch (err) {
      console.error(`Error handling @summary command: ${err}`);
      return {
        type: 'error',
        message: `Failed to generate summary: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @health command - Show health status
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleHealthCommand([component]) {
    console.log(`Handling @health command for: ${component || 'all'}`);
    
    try {
      // Get health status from navigation hub
      const healthStatus = this.navigationHub.healthStatus;
      
      if (!healthStatus) {
        return {
          type: 'error',
          message: 'Health status not available. Navigation hub may not be initialized properly.'
        };
      }
      
      if (!component || component === 'all') {
        return {
          type: 'healthStatus',
          status: healthStatus.status,
          issues: healthStatus.issues,
          successes: healthStatus.successes
        };
      } else {
        // Filter health status for specific component
        const filteredIssues = healthStatus.issues.filter(issue => 
          issue.toLowerCase().includes(component.toLowerCase())
        );
        
        const filteredSuccesses = healthStatus.successes.filter(success => 
          success.toLowerCase().includes(component.toLowerCase())
        );
        
        return {
          type: 'healthStatus',
          component,
          status: filteredIssues.length === 0 ? 'healthy' : 'issues',
          issues: filteredIssues,
          successes: filteredSuccesses
        };
      }
    } catch (err) {
      console.error(`Error handling @health command: ${err}`);
      return {
        type: 'error',
        message: `Failed to get health status: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @view command - Generate specialized view
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleViewCommand([viewType, target]) {
    console.log(`Handling @view command for type: ${viewType}, target: ${target || 'default'}`);
    
    try {
      switch (viewType) {
        case 'project':
          return await this.generateProjectView(target);
        case 'service':
          return await this.generateServiceView(target);
        case 'code':
          return await this.generateCodeView(target);
        case 'docs':
          return await this.generateDocsView(target);
        case 'memory':
          return await this.generateMemoryView(target);
        default:
          return {
            type: 'error',
            message: `Unknown view type: ${viewType}`
          };
      }
    } catch (err) {
      console.error(`Error handling @view command: ${err}`);
      return {
        type: 'error',
        message: `Failed to generate view: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @diagram command - Generate diagram
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleDiagramCommand([diagramType, target]) {
    console.log(`Handling @diagram command for type: ${diagramType}, target: ${target || 'default'}`);
    
    try {
      switch (diagramType) {
        case 'architecture':
          return await this.generateArchitectureDiagram(target);
        case 'component':
          return await this.generateComponentDiagram(target);
        case 'flow':
          return await this.generateFlowDiagram(target);
        case 'structure':
          return await this.generateStructureDiagram(target);
        default:
          return {
            type: 'error',
            message: `Unknown diagram type: ${diagramType}`
          };
      }
    } catch (err) {
      console.error(`Error handling @diagram command: ${err}`);
      return {
        type: 'error',
        message: `Failed to generate diagram: ${err.message}`
      };
    }
  }
  
  /**
   * Handle @compare command - Compare two files or folders
   * @param {Array<string>} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  async handleCompareCommand([path1, path2]) {
    console.log(`Handling @compare command for: ${path1} and ${path2}`);
    
    try {
      const resolvedPath1 = this.resolvePath(path1);
      const resolvedPath2 = this.resolvePath(path2);
      
      // Check if both paths exist
      if (!fs.existsSync(resolvedPath1)) {
        return {
          type: 'error',
          message: `First path not found: ${path1}`
        };
      }
      
      if (!fs.existsSync(resolvedPath2)) {
        return {
          type: 'error',
          message: `Second path not found: ${path2}`
        };
      }
      
      const stats1 = fs.statSync(resolvedPath1);
      const stats2 = fs.statSync(resolvedPath2);
      
      // Check if both are the same type (file or directory)
      if (stats1.isFile() && stats2.isFile()) {
        // Compare files
        return await this.compareFiles(resolvedPath1, resolvedPath2);
      } else if (stats1.isDirectory() && stats2.isDirectory()) {
        // Compare directories
        return await this.compareDirectories(resolvedPath1, resolvedPath2);
      } else {
        return {
          type: 'error',
          message: 'Cannot compare a file with a directory'
        };
      }
    } catch (err) {
      console.error(`Error handling @compare command: ${err}`);
      return {
        type: 'error',
        message: `Failed to compare: ${err.message}`
      };
    }
  }
  
  /**
   * Helper method to resolve path relative to project root
   * @param {string} filePath - File path to resolve
   * @param {string} baseDir - Base directory (optional)
   * @returns {string} Resolved path
   */
  resolvePath(filePath, baseDir = '') {
    const projectRoot = path.join(__dirname, '..');
    
    if (baseDir) {
      return path.resolve(projectRoot, baseDir, filePath);
    }
    
    return path.resolve(projectRoot, filePath);
  }
  
  /**
   * Recursively find files matching a pattern
   * @param {string} dir - Directory to search
   * @param {Function} matchFn - Function to match files
   * @param {Array<string>} results - Array to collect results
   * @param {Array<string>} excludes - Directories to exclude
   * @returns {Promise<void>}
   */
  async findFiles(dir, matchFn, results, excludes = ['node_modules', '.git', 'dist', 'build']) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (excludes.includes(entry.name)) continue;
        
        // Recursively search subdirectory
        await this.findFiles(entryPath, matchFn, results, excludes);
      } else if (entry.isFile()) {
        // Check if file matches pattern
        if (matchFn(entry.name)) {
          results.push(entryPath);
        }
      }
    }
  }
  
  /**
   * Search for text in files
   * @param {string} dir - Directory to search
   * @param {string} query - Search query
   * @param {Array<Object>} results - Array to collect results
   * @param {Array<string>} extensions - File extensions to search (optional)
   * @param {Array<string>} excludes - Directories to exclude
   * @returns {Promise<void>}
   */
  async searchInFiles(dir, query, results, extensions = null, excludes = ['node_modules', '.git', 'dist', 'build']) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (excludes.includes(entry.name)) continue;
        
        // Recursively search subdirectory
        await this.searchInFiles(entryPath, query, results, extensions, excludes);
      } else if (entry.isFile()) {
        // Skip files with wrong extension if extensions specified
        if (extensions && !extensions.some(ext => entry.name.endsWith(ext))) {
          continue;
        }
        
        // Skip binary files
        if (this.isBinaryExtension(path.extname(entry.name))) {
          continue;
        }
        
        // Read file and search for query
        try {
          const content = fs.readFileSync(entryPath, 'utf8');
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(query)) {
              // Find the surrounding context (3 lines before and after)
              const start = Math.max(0, i - 3);
              const end = Math.min(lines.length, i + 4);
              const context = lines.slice(start, end);
              
              results.push({
                path: path.relative(path.join(__dirname, '..'), entryPath),
                line: i + 1,
                context: context.join('\n'),
                match: lines[i]
              });
            }
          }
        } catch (err) {
          // Skip files that can't be read
          console.error(`Error reading file ${entryPath}: ${err.message}`);
        }
      }
    }
  }
  
  /**
   * Check if a file extension is likely to be binary
   * @param {string} ext - File extension (with dot)
   * @returns {boolean} True if likely binary
   */
  isBinaryExtension(ext) {
    const binaryExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.gz', '.tar', '.7z', '.rar',
      '.exe', '.dll', '.so', '.dylib',
      '.class', '.pyc', '.pyo',
      '.mp3', '.mp4', '.avi', '.mov', '.flv',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
    ];
    
    return binaryExtensions.includes(ext.toLowerCase());
  }
  
  /**
   * Scan a directory recursively
   * @param {string} dir - Directory to scan
   * @param {Array<string>} excludes - Directories to exclude
   * @returns {Object} Directory structure
   */
  scanDirectory(dir, excludes = ['node_modules', '.git', 'dist', 'build']) {
    const result = {
      files: [],
      directories: []
    };
    
    if (!fs.existsSync(dir)) {
      return result;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Skip excluded directories
      if (excludes.includes(item)) continue;
      
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const subDir = this.scanDirectory(itemPath, excludes);
        result.directories.push({
          name: item,
          path: itemPath,
          files: subDir.files,
          directories: subDir.directories
        });
      } else {
        result.files.push({
          name: item,
          path: itemPath,
          size: stats.size,
          modified: stats.mtime
        });
      }
    }
    
    return result;
  }
  
  /**
   * Flatten files from a directory structure
   * @param {Object} dir - Directory object
   * @returns {Array<Object>} Flattened file list
   */
  flattenFiles(dir) {
    let files = [...dir.files];
    
    for (const subDir of dir.directories) {
      files = files.concat(this.flattenFiles(subDir));
    }
    
    return files;
  }
  
  /**
   * Count files in a directory structure
   * @param {Object} dir - Directory object
   * @returns {number} File count
   */
  countFiles(dir) {
    let count = dir.files.length;
    
    for (const subDir of dir.directories) {
      count += this.countFiles(subDir);
    }
    
    return count;
  }
  
  /**
   * Explain a file
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} Explanation result
   */
  async explainFile(filePath) {
    // Read the file
    const resolvedPath = this.resolvePath(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      return {
        type: 'error',
        message: `File not found: ${filePath}`
      };
    }
    
    const result = await utils.file.readFile(resolvedPath);
    
    if (!result.success) {
      return {
        type: 'error',
        message: `Could not read file: ${filePath} - ${result.error?.message}`
      };
    }
    
    const content = result.value;
    const ext = path.extname(filePath);
    
    return {
      type: 'fileExplanation',
      path: filePath,
      content,
      fileType: ext.substring(1).toLowerCase() || 'txt',
      // Include some basic statistics
      stats: {
        lines: content.split('\n').length,
        size: fs.statSync(resolvedPath).size,
        modified: fs.statSync(resolvedPath).mtime
      }
    };
  }
  
  /**
   * Explain a concept
   * @param {string} concept - Concept name
   * @returns {Promise<Object>} Explanation result
   */
  async explainConcept(concept) {
    // Search for the concept in documentation
    const docDir = path.join(__dirname, '..', 'docs');
    const matches = [];
    
    if (fs.existsSync(docDir)) {
      await this.searchInFiles(docDir, concept, matches, ['.md']);
    }
    
    return {
      type: 'conceptExplanation',
      concept,
      documentationMatches: matches
    };
  }
  
  /**
   * Summarize a file
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} Summary result
   */
  async summarizeFile(filePath) {
    // Read the file
    const result = await utils.file.readFile(filePath);
    
    if (!result.success) {
      return {
        type: 'error',
        message: `Could not read file: ${filePath} - ${result.error?.message}`
      };
    }
    
    const content = result.value;
    const lines = content.split('\n');
    const ext = path.extname(filePath);
    
    return {
      type: 'fileSummary',
      path: filePath,
      fileType: ext.substring(1).toLowerCase() || 'txt',
      stats: {
        lines: lines.length,
        size: fs.statSync(filePath).size,
        modified: fs.statSync(filePath).mtime
      },
      preview: lines.slice(0, 10).join('\n')
    };
  }
  
  /**
   * Compare two files
   * @param {string} file1 - Path to first file
   * @param {string} file2 - Path to second file
   * @returns {Promise<Object>} Comparison result
   */
  async compareFiles(file1, file2) {
    // Read both files
    const result1 = await utils.file.readFile(file1);
    const result2 = await utils.file.readFile(file2);
    
    if (!result1.success) {
      return {
        type: 'error',
        message: `Could not read first file: ${file1} - ${result1.error?.message}`
      };
    }
    
    if (!result2.success) {
      return {
        type: 'error',
        message: `Could not read second file: ${file2} - ${result2.error?.message}`
      };
    }
    
    const content1 = result1.value;
    const content2 = result2.value;
    
    // Simple line-by-line comparison
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    const differences = [];
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      if (i >= lines1.length) {
        differences.push({
          line: i + 1,
          type: 'added',
          content: lines2[i]
        });
      } else if (i >= lines2.length) {
        differences.push({
          line: i + 1,
          type: 'removed',
          content: lines1[i]
        });
      } else if (lines1[i] !== lines2[i]) {
        differences.push({
          line: i + 1,
          type: 'changed',
          content1: lines1[i],
          content2: lines2[i]
        });
      }
    }
    
    return {
      type: 'fileComparison',
      file1: path.relative(path.join(__dirname, '..'), file1),
      file2: path.relative(path.join(__dirname, '..'), file2),
      identical: differences.length === 0,
      differences,
      stats: {
        lines1: lines1.length,
        lines2: lines2.length,
        size1: fs.statSync(file1).size,
        size2: fs.statSync(file2).size
      }
    };
  }
  
  /**
   * Compare two directories
   * @param {string} dir1 - Path to first directory
   * @param {string} dir2 - Path to second directory
   * @returns {Promise<Object>} Comparison result
   */
  async compareDirectories(dir1, dir2) {
    // Scan both directories
    const structure1 = this.scanDirectory(dir1);
    const structure2 = this.scanDirectory(dir2);
    
    // Compare file lists
    const files1 = this.flattenFiles(structure1).map(file => path.relative(dir1, file.path));
    const files2 = this.flattenFiles(structure2).map(file => path.relative(dir2, file.path));
    
    // Find unique files in each directory
    const uniqueFiles1 = files1.filter(file => !files2.includes(file));
    const uniqueFiles2 = files2.filter(file => !files1.includes(file));
    
    // Find common files
    const commonFiles = files1.filter(file => files2.includes(file));
    
    return {
      type: 'directoryComparison',
      dir1: path.relative(path.join(__dirname, '..'), dir1),
      dir2: path.relative(path.join(__dirname, '..'), dir2),
      identical: uniqueFiles1.length === 0 && uniqueFiles2.length === 0,
      stats: {
        files1: files1.length,
        files2: files2.length,
        uniqueFiles1: uniqueFiles1.length,
        uniqueFiles2: uniqueFiles2.length,
        commonFiles: commonFiles.length
      },
      uniqueFiles1,
      uniqueFiles2,
      commonFiles
    };
  }
  
  /**
   * Generate project view
   * @param {string} target - Target scope
   * @returns {Promise<Object>} View result
   */
  async generateProjectView(target) {
    // Simple implementation for now
    const projectMap = this.navigationHub.projectMap;
    
    return {
      type: 'projectView',
      target: target || 'all',
      meta: projectMap.meta,
      implementation: projectMap.implementation
    };
  }
  
  /**
   * Generate service view
   * @param {string} target - Target service
   * @returns {Promise<Object>} View result
   */
  async generateServiceView(target) {
    if (!target) {
      // List all services
      return {
        type: 'serviceList',
        services: this.navigationHub.projectMap.implementation.directories.map(dir => dir.name)
      };
    }
    
    // Find the service
    const service = this.navigationHub.projectMap.implementation.directories.find(dir => dir.name === target);
    
    if (!service) {
      return {
        type: 'error',
        message: `Service not found: ${target}`
      };
    }
    
    return {
      type: 'serviceView',
      name: target,
      structure: service,
      files: this.flattenFiles(service)
    };
  }
  
  /**
   * Generate code view
   * @param {string} target - Target file
   * @returns {Promise<Object>} View result
   */
  async generateCodeView(target) {
    // Read the file
    const resolvedPath = this.resolvePath(target);
    
    if (!fs.existsSync(resolvedPath)) {
      return {
        type: 'error',
        message: `File not found: ${target}`
      };
    }
    
    const result = await utils.file.readFile(resolvedPath);
    
    if (!result.success) {
      return {
        type: 'error',
        message: `Could not read file: ${target} - ${result.error?.message}`
      };
    }
    
    return {
      type: 'codeView',
      path: target,
      content: result.value,
      fileType: path.extname(target).substring(1).toLowerCase() || 'txt'
    };
  }
  
  /**
   * Generate docs view
   * @param {string} target - Target path
   * @returns {Promise<Object>} View result
   */
  async generateDocsView(target) {
    // If no target, show top-level docs
    if (!target) {
      const docsDir = path.join(__dirname, '..', 'docs');
      
      if (!fs.existsSync(docsDir)) {
        return {
          type: 'error',
          message: 'Documentation directory not found'
        };
      }
      
      const entries = fs.readdirSync(docsDir, { withFileTypes: true });
      
      const dirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      const files = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => entry.name);
      
      return {
        type: 'docsView',
        target: 'root',
        directories: dirs,
        files
      };
    }
    
    // Resolve target path
    const resolvedPath = this.resolvePath(target, 'docs');
    
    if (!fs.existsSync(resolvedPath)) {
      return {
        type: 'error',
        message: `Documentation path not found: ${target}`
      };
    }
    
    const stats = fs.statSync(resolvedPath);
    
    if (stats.isDirectory()) {
      // List markdown files in directory
      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
      
      const dirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      const files = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => entry.name);
      
      return {
        type: 'docsView',
        target,
        directories: dirs,
        files
      };
    } else if (stats.isFile()) {
      // Read documentation file
      const content = fs.readFileSync(resolvedPath, 'utf8');
      
      return {
        type: 'docContent',
        path: target,
        content
      };
    }
    
    return {
      type: 'error',
      message: `Invalid documentation path: ${target}`
    };
  }
  
  /**
   * Generate memory view
   * @param {string} target - Target scope
   * @returns {Promise<Object>} View result
   */
  async generateMemoryView(target) {
    if (target === 'files') {
      // Show referenced files
      return {
        type: 'memoryFilesView',
        files: this.memoryManager.getReferencedFiles()
      };
    } else if (target === 'history') {
      // Show conversation history
      return {
        type: 'memoryHistoryView',
        history: this.memoryManager.getRecentHistory(20)
      };
    } else if (target === 'context') {
      // Show relevant context
      return {
        type: 'memoryContextView',
        context: this.memoryManager.getRelevantContext('')
      };
    } else {
      // Show all memory
      return {
        type: 'memoryView',
        files: this.memoryManager.getReferencedFiles(),
        history: this.memoryManager.getRecentHistory(10),
        context: this.memoryManager.getRelevantContext('')
      };
    }
  }
  
  /**
   * Generate architecture diagram
   * @param {string} target - Target service
   * @returns {Promise<Object>} Diagram result
   */
  async generateArchitectureDiagram(target) {
    // Get service info
    let serviceInfo;
    
    if (target) {
      // Find specific service
      serviceInfo = this.navigationHub.projectMap.implementation.directories.find(dir => dir.name === target);
      
      if (!serviceInfo) {
        return {
          type: 'error',
          message: `Service not found: ${target}`
        };
      }
    } else {
      // Use all services
      serviceInfo = this.navigationHub.projectMap.implementation.directories;
    }
    
    // Generate mermaid diagram
    const diagram = [
      'graph TD',
      '  subgraph Meta',
      '    Config[Configuration]',
      '    Scripts[Scripts]',
      '    Docs[Documentation]',
      '  end',
      '',
      '  subgraph Implementation'
    ];
    
    // Add service components
    if (Array.isArray(serviceInfo)) {
      // Multiple services
      for (const service of serviceInfo) {
        diagram.push(`    ${service.name}[${service.name}]`);
      }
      
      // Add connections between services
      for (let i = 0; i < serviceInfo.length - 1; i++) {
        diagram.push(`    ${serviceInfo[i].name} --- ${serviceInfo[i+1].name}`);
      }
    } else {
      // Single service
      diagram.push(`    ${serviceInfo.name}[${serviceInfo.name}]`);
      
      // Add components
      for (const dir of serviceInfo.directories) {
        diagram.push(`    ${dir.name}[${dir.name}]`);
        diagram.push(`    ${serviceInfo.name} --> ${dir.name}`);
      }
    }
    
    diagram.push('  end');
    
    // Add meta connections
    diagram.push('  Config --> Implementation');
    diagram.push('  Scripts --> Implementation');
    diagram.push('  Docs --> Implementation');
    
    return {
      type: 'diagram',
      diagramType: 'architecture',
      target: target || 'all',
      format: 'mermaid',
      content: diagram.join('\n')
    };
  }
  
  /**
   * Generate component diagram
   * @param {string} target - Target component
   * @returns {Promise<Object>} Diagram result
   */
  async generateComponentDiagram(target) {
    // Simple implementation for now
    const diagram = [
      'graph LR',
      '  subgraph Component',
      `    ${target}[${target}]`,
      '    API[API]',
      '    Database[Database]',
      '    Logic[Logic]',
      '  end',
      '',
      '  Client --> API',
      '  API --> Logic',
      '  Logic --> Database'
    ];
    
    return {
      type: 'diagram',
      diagramType: 'component',
      target,
      format: 'mermaid',
      content: diagram.join('\n')
    };
  }
  
  /**
   * Generate flow diagram
   * @param {string} target - Target process
   * @returns {Promise<Object>} Diagram result
   */
  async generateFlowDiagram(target) {
    // Simple implementation for now
    const diagram = [
      'graph TD',
      '  A[Start] --> B[Process]',
      '  B --> C{Decision}',
      '  C -->|Yes| D[Action 1]',
      '  C -->|No| E[Action 2]',
      '  D --> F[End]',
      '  E --> F'
    ];
    
    return {
      type: 'diagram',
      diagramType: 'flow',
      target,
      format: 'mermaid',
      content: diagram.join('\n')
    };
  }
  
  /**
   * Generate structure diagram
   * @param {string} target - Target directory
   * @returns {Promise<Object>} Diagram result
   */
  async generateStructureDiagram(target) {
    // Resolve target path
    const resolvedPath = this.resolvePath(target || '.');
    
    if (!fs.existsSync(resolvedPath)) {
      return {
        type: 'error',
        message: `Path not found: ${target}`
      };
    }
    
    const stats = fs.statSync(resolvedPath);
    
    if (!stats.isDirectory()) {
      return {
        type: 'error',
        message: `Not a directory: ${target}`
      };
    }
    
    // Scan directory (limit depth)
    const scanWithDepth = (dir, depth = 2) => {
      if (depth <= 0) {
        return { files: [], directories: [] };
      }
      
      const result = {
        files: [],
        directories: []
      };
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          
          if (entry.isDirectory()) {
            const subDir = scanWithDepth(path.join(dir, entry.name), depth - 1);
            result.directories.push({
              name: entry.name,
              files: subDir.files,
              directories: subDir.directories
            });
          } else {
            result.files.push({
              name: entry.name
            });
          }
        }
      } catch (err) {
        // Ignore errors
      }
      
      return result;
    };
    
    const structure = scanWithDepth(resolvedPath);
    
    // Generate diagram
    const diagram = ['graph TD'];
    
    // Add root node
    const rootName = path.basename(resolvedPath);
    diagram.push(`  Root[${rootName}]`);
    
    // Process directory structure
    const processDir = (dir, parentName, prefix = '') => {
      // Add directory nodes
      for (const subDir of dir.directories) {
        const nodeName = `${prefix}${subDir.name}`;
        diagram.push(`  ${nodeName}[${subDir.name}]`);
        diagram.push(`  ${parentName} --> ${nodeName}`);
        
        // Process subdirectories
        processDir(subDir, nodeName, `${prefix}${subDir.name}_`);
      }
      
      // Add file nodes (limit to 5 files per directory)
      const files = dir.files.slice(0, 5);
      for (const file of files) {
        const nodeName = `${prefix}${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        diagram.push(`  ${nodeName}[${file.name}]`);
        diagram.push(`  ${parentName} --> ${nodeName}`);
      }
      
      // Add indicator if there are more files
      if (dir.files.length > 5) {
        const moreName = `${prefix}more_files`;
        diagram.push(`  ${moreName}[... ${dir.files.length - 5} more files]`);
        diagram.push(`  ${parentName} --> ${moreName}`);
      }
    };
    
    // Process root directory
    processDir(structure, 'Root');
    
    return {
      type: 'diagram',
      diagramType: 'structure',
      target: target || '.',
      format: 'mermaid',
      content: diagram.join('\n')
    };
  }
}

module.exports = CommandProcessor;
