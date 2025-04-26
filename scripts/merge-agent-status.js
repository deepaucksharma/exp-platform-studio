#!/usr/bin/env node

/**
 * Agent Status Merger
 * Merges individual agent status files into the main project-status.md file
 */

const utils = require('../utils');
const logger = utils.logger.createScopedLogger('AgentStatusMerger');

/**
 * Main function
 */
function main() {
  logger.info('DStudio Agent Status Merger');
  logger.info('==========================');
  
  // Ensure status directory exists
  if (!utils.path.pathExists(utils.path.resolveProjectPath('status'))) {
    if (utils.path.ensureDir(utils.path.resolveProjectPath('status'))) {
      logger.info('Created status directory');
    } else {
      logger.error('Failed to create status directory');
      return;
    }
  }
  
  // Generate merged project status
  const result = utils.project.generateProjectStatus();
  
  if (result.success) {
    const statusFiles = utils.project.readAgentStatusFiles();
    logger.info(`Project status updated with ${statusFiles.value.length} agent status files.`);
  } else {
    logger.warn(`Failed to update project status: ${result.error || 'Unknown error'}`);
  }
}

// Run the main function with error handling
try {
  main();
} catch (err) {
  utils.error.createErrorHandler('merge-agent-status')(err);
}
