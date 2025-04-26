#!/usr/bin/env node

/**
 * Specification Index Generator
 * Parses spec.md and creates structured index with requirements and diagrams
 * Adds implementation-specific tagging
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SPEC_FILE_PATH = 'docs/spec.md';
const INDEX_FILE_PATH = 'spec.index.json';
const IMPLEMENTATION_DIR = 'generated_implementation';

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const REQUIREMENT_REGEX = /^[*-]\s+\[([ x])\]\s+(?:([A-Za-z0-9.-]+):\s+)?(.+)$/;
const DIAGRAM_START_REGEX = /^```(mermaid|plantuml|ascii|graphviz|dot)\s*(\S+)?$/;
const DIAGRAM_END_REGEX = /^```$/;
const TASK_ID_REGEX = /^([A-Z]+-\d+(?:-\d+)*)/;
const IMPLEMENTATION_TAG = '[IMPL]'; // Tag to identify implementation-specific requirements

function getFileChecksum(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: Specification file not found at ${filePath}`);
      return 'spec-file-not-found';
    }
    console.error(`Error calculating checksum for ${filePath}:`, err.message);
    return 'error-calculating-checksum';
  }
}

function parseSpecification(specPath) {
  let content;
  try {
    content = fs.readFileSync(specPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: Specification file not found at ${specPath}`);
      return {
        version: '1.1',
        generated: new Date().toISOString(),
        error: `Specification file not found: ${specPath}`,
        checksum: 'spec-file-not-found',
        sections: [], requirements: [], diagrams: [], tasks: [], stats: { 
          totalSections: 0, 
          totalRequirements: 0, 
          completedRequirements: 0, 
          totalDiagrams: 0, 
          totalTasks: 0,
          implementationRequirements: 0
        }
      };
    }
    throw err;
  }

  const lines = content.split('\n');
  const checksum = getFileChecksum(specPath);

  const index = {
    version: '1.1',
    generated: new Date().toISOString(),
    checksum: checksum,
    implementationDir: IMPLEMENTATION_DIR,
    sections: [],
    requirements: [],
    diagrams: [],
    tasks: {},
    stats: {
      totalSections: 0,
      totalRequirements: 0,
      completedRequirements: 0,
      totalDiagrams: 0,
      totalTasks: 0,
      implementationRequirements: 0
    }
  };

  let currentSectionHierarchy = [];
  let inDiagram = false;
  let currentDiagram = null;

  function findParentSection(level) {
    while (currentSectionHierarchy.length > 0 && currentSectionHierarchy[currentSectionHierarchy.length - 1].level >= level) {
      currentSectionHierarchy.pop();
    }
    return currentSectionHierarchy.length > 0 ? currentSectionHierarchy[currentSectionHierarchy.length - 1] : null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine && !inDiagram) continue;

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
        subsections: [] 
      };
      const parent = findParentSection(level);

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
                             (currentSectionHierarchy.length > 1 && currentSectionHierarchy[currentSectionHierarchy.length - 2].isImplementation)
          };
          index.stats.totalTasks++;
        }
      }
      continue;
    }

    const reqMatch = line.match(REQUIREMENT_REGEX);
    if (reqMatch && !inDiagram) {
      const completed = reqMatch[1] === 'x';
      const id = reqMatch[2] || null;
      const text = reqMatch[3].trim();
      const currentSection = currentSectionHierarchy.length > 0 ? currentSectionHierarchy[currentSectionHierarchy.length - 1] : null;

      const isImplementationReq = text.includes(IMPLEMENTATION_TAG) || 
                                 (currentSection && currentSection.isImplementation);

      const requirement = {
        id, text, completed, line: i + 1,
        section: currentSection ? currentSection.title : null,
        sectionPath: currentSection ? currentSection.path : null,
        isImplementation: isImplementationReq
      };

      index.requirements.push(requirement);
      index.stats.totalRequirements++;
      if (completed) index.stats.completedRequirements++;
      if (isImplementationReq) index.stats.implementationRequirements++;

      const currentTaskSection = currentSectionHierarchy.find(s => s.title.match(TASK_ID_REGEX));
      if (currentTaskSection) {
        const taskIdMatch = currentTaskSection.title.match(TASK_ID_REGEX);
        if (taskIdMatch && index.tasks[taskIdMatch[1]]) {
          index.tasks[taskIdMatch[1]].requirements.push(requirement);
        }
      }
      continue;
    }

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
          isImplementation: currentSection ? currentSection.isImplementation : false
        };
      }
    } else {
      if (line.match(DIAGRAM_END_REGEX)) {
        inDiagram = false;
        currentDiagram.endLine = i + 1;
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

function generateSpecIndex() {
  const specPath = SPEC_FILE_PATH;
  const index = parseSpecification(specPath);

  if (index.error && index.checksum === 'spec-file-not-found') process.exit(1);

  try {
    fs.writeFileSync(INDEX_FILE_PATH, JSON.stringify(index, null, 2));
    console.log(`Specification index generated: ${INDEX_FILE_PATH}
- Checksum: ${index.checksum}
- Sections: ${index.stats.totalSections}
- Requirements: ${index.stats.totalRequirements} (${index.stats.completedRequirements} completed)
- Implementation Requirements: ${index.stats.implementationRequirements}
- Tasks: ${index.stats.totalTasks}
- Diagrams: ${index.stats.totalDiagrams}`);
  } catch (writeErr) {
    console.error(`Error writing specification index to ${INDEX_FILE_PATH}:`, writeErr.message);
    process.exit(1);
  }
}

try {
  generateSpecIndex();
} catch (error) {
  console.error('Failed to generate specification index:', error.message, error.stack);
  process.exit(1);
}