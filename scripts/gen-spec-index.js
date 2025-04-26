#!/usr/bin/env node

/**
 * Specification Index Generator
 * Parses spec.md and creates structured index with requirements and diagrams
 * Adds implementation-specific tagging
 * Now supports service-specific specs via include directives
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('SpecIndexGenerator');

// Configuration
const SPEC_FILE_PATH = utils.path.resolveProjectPath('docs/spec.md');
const INDEX_FILE_PATH = utils.path.resolveProjectPath('spec.index.json');
const IMPLEMENTATION_DIR = utils.config.get('workspace.implementationDir', 'generated_implementation');

// Regular expressions for parsing
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const REQUIREMENT_REGEX = /^[*-]\s+\[([ x])\]\s+(?:([A-Za-z0-9.-]+):\s+)?(.+)$/;
const DIAGRAM_START_REGEX = /^```(mermaid|plantuml|ascii|graphviz|dot)\s*(\S+)?$/;
const DIAGRAM_END_REGEX = /^```$/;
const TASK_ID_REGEX = /^([A-Z]+-\d+(?:-\d+)*)/;
const IMPLEMENTATION_TAG = '[IMPL]'; // Tag to identify implementation-specific requirements
const INCLUDE_REGEX = /^#\s*include\s+(.+)$/; // Match # include directives
const INCLUDE_COMMENT_REGEX = /<!-- BEGIN INCLUDE: (.+) -->/;

/**
 * Process include directives in spec file
 * @param {string} content - Content of the spec file
 * @param {string} basePath - Base path to resolve relative includes from
 * @returns {string} Processed content with includes expanded
 */
async function processIncludes(content, basePath = 'docs') {
  const lines = content.split('\n');
  const result = [];
  const processedIncludes = new Set(); // Track processed includes to prevent infinite recursion
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const includeMatch = line.match(INCLUDE_REGEX);
    
    if (includeMatch) {
      const includePath = utils.path.joinPath(basePath, includeMatch[1]);
      
      // Skip already processed includes to prevent infinite recursion
      if (processedIncludes.has(includePath)) {
        result.push(`<!-- Skipped already included file: ${includePath} -->`);
        continue;
      }
      
      const fileResult = await utils.file.readFile(includePath);
      if (fileResult.success) {
        logger.info(`Processing include: ${includePath}`);
        const includeContent = fileResult.value;
        processedIncludes.add(includePath);
        
        // Process nested includes (use dirname of the included file as base path)
        const processedContent = await processIncludes(
          includeContent, 
          utils.path.getParentDirectory(includePath)
        );
        
        result.push(`<!-- BEGIN INCLUDE: ${includePath} -->`);
        result.push(processedContent);
        result.push(`<!-- END INCLUDE: ${includePath} -->`);
      } else {
        logger.error(`Error processing include directive for ${includePath}: ${fileResult.error?.message}`);
        result.push(`<!-- ERROR including ${includePath}: ${fileResult.error?.message} -->`);
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * Find parent section in section hierarchy
 * @param {Array} currentSectionHierarchy - Current section hierarchy
 * @param {number} level - Level of current section
 * @returns {Object|null} Parent section or null
 */
function findParentSection(currentSectionHierarchy, level) {
  let hierarchy = [...currentSectionHierarchy];
  while (hierarchy.length > 0 && hierarchy[hierarchy.length - 1].level >= level) {
    hierarchy.pop();
  }
  return hierarchy.length > 0 ? hierarchy[hierarchy.length - 1] : null;
}

/**
 * Parse specification file
 * @param {string} specPath - Path to specification file
 * @returns {Promise<Object>} Parsed specification index
 */
async function parseSpecification(specPath) {
  // Set up the index object with default values
  const index = {
    version: '1.2',
    generated: new Date().toISOString(),
    implementationDir: IMPLEMENTATION_DIR,
    sections: [],
    requirements: [],
    diagrams: [],
    tasks: {},
    includes: [],
    stats: {
      totalSections: 0,
      totalRequirements: 0,
      completedRequirements: 0,
      totalDiagrams: 0,
      totalTasks: 0,
      implementationRequirements: 0,
      serviceSpecs: 0
    }
  };

  // Read the raw content
  const rawContentResult = await utils.file.readFile(specPath);
  if (!rawContentResult.success) {
    logger.error(`Specification file not found at ${specPath}`);
    index.error = `Specification file not found: ${specPath}`;
    index.checksum = 'spec-file-not-found';
    return index;
  }
  
  // Process include directives
  const rawContent = rawContentResult.value;
  const content = await processIncludes(rawContent, utils.path.getParentDirectory(specPath));
  
  // Calculate checksum from the expanded content
  const checksumResult = await utils.error.tryAsync(async () => {
    return require('crypto').createHash('sha256').update(content).digest('hex');
  });
  
  index.checksum = checksumResult.success ? checksumResult.value : 'error-calculating-checksum';
  
  const lines = content.split('\n');
  
  // Parse the specification
  let currentSectionHierarchy = [];
  let inDiagram = false;
  let currentDiagram = null;
  let currentIncludePath = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine && !inDiagram) continue;
    
    // Track include boundaries
    const includeMatch = line.match(INCLUDE_COMMENT_REGEX);
    if (includeMatch) {
      currentIncludePath = includeMatch[1];
      
      // Add to includes list
      const includeRelPath = utils.path.getRelativeToProjectRoot(currentIncludePath);
      const isServiceSpec = includeRelPath.startsWith('docs/services/');
      
      if (isServiceSpec) {
        index.stats.serviceSpecs++;
      }
      
      index.includes.push({
        path: currentIncludePath,
        relativePath: includeRelPath,
        startLine: i + 1,
        endLine: null, // Will be set when we find the end comment
        isServiceSpec
      });
      
      continue;
    }
    
    // Check for end of include
    if (line.trim().startsWith('<!-- END INCLUDE:') && currentIncludePath) {
      // Find the include in our list and update the end line
      const include = index.includes.find(inc => inc.path === currentIncludePath);
      if (include) {
        include.endLine = i + 1;
      }
      currentIncludePath = null;
      continue;
    }

    // Process headings
    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch && !inDiagram) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const section = { 
        level, 
        title, 
        line: i + 1, 
        path: '',
        isImplementation: title.includes(IMPLEMENTATION_TAG),
        subsections: [],
        fromInclude: currentIncludePath
      };
      
      const parent = findParentSection(currentSectionHierarchy, level);

      if (parent) {
        parent.subsections.push(section);
        section.path = `${parent.path}/${title.toLowerCase().replace(/\s+/g, '-')}`;
        // Inherit implementation flag from parent
        if (parent.isImplementation) section.isImplementation = true;
      } else {
        index.sections.push(section);
        section.path = title.toLowerCase().replace(/\s+/g, '-');
      }
      
      currentSectionHierarchy = currentSectionHierarchy.slice(0, level - 1);
      currentSectionHierarchy.push(section);
      index.stats.totalSections++;

      // Check for task IDs in headings
      const taskMatch = title.match(TASK_ID_REGEX);
      if (taskMatch) {
        const taskId = taskMatch[1];
        if (!index.tasks[taskId]) {
          index.tasks[taskId] = { 
            id: taskId, 
            title: title.substring(taskMatch[0].length).trim(), 
            requirements: [], 
            line: i + 1, 
            descriptionLines: [],
            isImplementation: title.includes(IMPLEMENTATION_TAG) || 
                             (currentSectionHierarchy.length > 1 && currentSectionHierarchy[currentSectionHierarchy.length - 2].isImplementation),
            fromInclude: currentIncludePath
          };
          index.stats.totalTasks++;
        }
      }
      continue;
    }

    // Process requirements
    const reqMatch = line.match(REQUIREMENT_REGEX);
    if (reqMatch && !inDiagram) {
      const completed = reqMatch[1] === 'x';
      const id = reqMatch[2] || null;
      const text = reqMatch[3].trim();
      const currentSection = currentSectionHierarchy.length > 0 ? currentSectionHierarchy[currentSectionHierarchy.length - 1] : null;

      const isImplementationReq = text.includes(IMPLEMENTATION_TAG) || 
                                 (currentSection && currentSection.isImplementation);

      const requirement = {
        id, 
        text, 
        completed, 
        line: i + 1,
        section: currentSection ? currentSection.title : null,
        sectionPath: currentSection ? currentSection.path : null,
        isImplementation: isImplementationReq,
        fromInclude: currentIncludePath
      };

      index.requirements.push(requirement);
      index.stats.totalRequirements++;
      if (completed) index.stats.completedRequirements++;
      if (isImplementationReq) index.stats.implementationRequirements++;

      // Associate requirement with task if we're in a task section
      const currentTaskSection = currentSectionHierarchy.find(s => s.title.match(TASK_ID_REGEX));
      if (currentTaskSection) {
        const taskIdMatch = currentTaskSection.title.match(TASK_ID_REGEX);
        if (taskIdMatch && index.tasks[taskIdMatch[1]]) {
          index.tasks[taskIdMatch[1]].requirements.push(requirement);
        }
      }
      continue;
    }

    // Process diagrams
    if (!inDiagram) {
      const diagramStartMatch = line.match(DIAGRAM_START_REGEX);
      if (diagramStartMatch) {
        inDiagram = true;
        const currentSection = currentSectionHierarchy.length > 0 ? currentSectionHierarchy[currentSectionHierarchy.length - 1] : null;
        currentDiagram = {
          type: diagramStartMatch[1],
          id: diagramStartMatch[2] || `diagram-${index.stats.totalDiagrams + 1}`,
          startLine: i + 1,
          content: [],
          section: currentSection ? currentSection.title : null,
          sectionPath: currentSection ? currentSection.path : null,
          isImplementation: currentSection ? currentSection.isImplementation : false,
          fromInclude: currentIncludePath
        };
      }
    } else {
      if (line.match(DIAGRAM_END_REGEX)) {
        inDiagram = false;
        currentDiagram.endLine = i + 1;
        
        // Trim empty lines from start and end of diagram
        while (currentDiagram.content.length > 0 && currentDiagram.content[0].trim() === '') {
          currentDiagram.content.shift();
          currentDiagram.startLine++;
        }
        while (currentDiagram.content.length > 0 && currentDiagram.content[currentDiagram.content.length - 1].trim() === '') {
          currentDiagram.content.pop();
          currentDiagram.endLine--;
        }
        
        index.diagrams.push(currentDiagram);
        index.stats.totalDiagrams++;
        currentDiagram = null;
      } else {
        currentDiagram.content.push(line);
      }
      continue;
    }

    // Collect task description lines
    const currentTaskSection = currentSectionHierarchy.find(s => s.title.match(TASK_ID_REGEX));
    if (currentTaskSection && trimmedLine) {
      const taskIdMatch = currentTaskSection.title.match(TASK_ID_REGEX);
      if (taskIdMatch && index.tasks[taskIdMatch[1]]) {
        index.tasks[taskIdMatch[1]].descriptionLines.push(line);
      }
    }
  }

  return index;
}

/**
 * Generate the specification index file
 */
async function generateSpecIndex() {
  logger.info('Generating specification index...');
  
  // Parse the specification
  const index = await parseSpecification(SPEC_FILE_PATH);

  // Exit if spec file not found
  if (index.error && index.checksum === 'spec-file-not-found') {
    utils.error.ExecutionError(`Specification file not found: ${SPEC_FILE_PATH}`);
  }

  // Write the index file
  const writeResult = await utils.file.writeFile(INDEX_FILE_PATH, JSON.stringify(index, null, 2));
  
  if (writeResult.success) {
    logger.info(`Specification index generated: ${INDEX_FILE_PATH}`);
    logger.info(`- Checksum: ${index.checksum}`);
    logger.info(`- Sections: ${index.stats.totalSections}`);
    logger.info(`- Requirements: ${index.stats.totalRequirements} (${index.stats.completedRequirements} completed)`);
    logger.info(`- Implementation Requirements: ${index.stats.implementationRequirements}`);
    logger.info(`- Tasks: ${index.stats.totalTasks}`);
    logger.info(`- Diagrams: ${index.stats.totalDiagrams}`);
    logger.info(`- Service Specs: ${index.stats.serviceSpecs}`);
  } else {
    throw utils.error.FileSystemError(`Error writing specification index to ${INDEX_FILE_PATH}: ${writeResult.error?.message}`);
  }
}

// Run the main function with error handling
utils.error.withErrorHandling(async () => {
  await generateSpecIndex();
}, {
  exitOnError: true,
  logErrors: true,
  defaultErrorType: utils.error.ERROR_TYPES.FILE_SYSTEM
})();
