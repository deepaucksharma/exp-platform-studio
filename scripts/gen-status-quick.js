#!/usr/bin/env node

/**
 * Quick Status Generator
 * Creates a quick status file with current project status, metrics, and basic env info.
 * Handles implementation-specific and meta project information separately.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const STATUS_FILE_PATH = 'project-status.md';
const QUICK_STATUS_PATH = 'status.quick.json';
const METRICS_FILE_PATH = 'docs/metrics.md';
const SPEC_INDEX_PATH = 'spec.index.json';
const LAYOUT_PATH = 'project-layout.json';
const ISSUES_LOG_PATH = 'issues.log';
const IMPLEMENTATION_DIR = 'generated_implementation';

function readJsonSafe(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`Warning: Could not read or parse JSON file ${filePath}:`, err.message);
  }
  return defaultValue;
}

function getFileChecksumSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 'file-not-found';
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    console.warn(`Warning: Error calculating checksum for ${filePath}:`, err.message);
    return 'error-calculating-checksum';
  }
}

function countRecentIssues(logPath, hours = 24) {
  let critical = 0, errors = 0, warnings = 0;
  if (!fs.existsSync(logPath)) return { critical, errors, warnings };

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    const threshold = Date.now() - hours * 60 * 60 * 1000;

    for (const line of lines) {
      const timestampMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}Z?)\]/);
      if (timestampMatch) {
        try {
          const lineDate = new Date(timestampMatch[1].replace(' ', 'T') + (timestampMatch[1].endsWith('Z') ? '' : 'Z')).getTime();
          if (lineDate >= threshold) {
            if (line.includes('[CRITICAL]') || line.includes('[ALERT]')) critical++;
            else if (line.includes('[ERROR]')) errors++;
            else if (line.includes('[WARN]')) warnings++;
          }
        } catch (dateErr) { /* ignore lines with bad dates */ }
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read issues log ${logPath}:`, err.message);
  }
  return { critical, errors, warnings };
}

function parseProjectStatus(statusPath) {
  let content;
  try {
    if (!fs.existsSync(statusPath)) {
      const initialStatus = `# Project Status - ${new Date().toISOString()}

## 🚀 Current Iteration
*No active task*

## ✅ Completed Tasks
*None yet*

## 📝 Pending Tasks
*Pending task extraction from specification*

## 🚧 Blockers
*None*
`;
      fs.writeFileSync(statusPath, initialStatus);
      console.log(`Created initial project status file: ${statusPath}`);
      content = initialStatus;
    } else {
      content = fs.readFileSync(statusPath, 'utf8');
    }
  } catch (err) {
    console.error(`Error accessing project status file ${statusPath}:`, err.message);
    return {
      parseError: err.message,
      lastUpdated: new Date(0).toISOString(),
      next_task: null,
      last_done: null,
      blockers: [],
      pending: []
    };
  }

  const lines = content.split('\n');
  const status = {
    lastUpdated: fs.existsSync(statusPath) ? fs.statSync(statusPath).mtime.toISOString() : new Date(0).toISOString(),
    next_task: null,
    last_done: null,
    blockers: [],
    pending: []
  };

  let currentSection = null;
  const taskRegex = /^[*-]\s+([A-Z]+-\d+(?:-\d+)*)[:\s]+(.+)$/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('## ')) {
      currentSection = trimmedLine.substring(3).trim().toLowerCase();
      continue;
    }
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const taskMatch = trimmedLine.match(taskRegex);
    if (currentSection === '🚀 current iteration' || currentSection === 'current task') {
      if (taskMatch && !status.next_task) {
        status.next_task = { id: taskMatch[1], title: taskMatch[2].trim() };
      } else if (!taskMatch && trimmedLine !== '*No active task*' && !status.next_task) {
        status.next_task = { id: null, title: trimmedLine.replace(/^[*-]\s+/, '') };
      }
    } else if (currentSection === '✅ completed tasks') {
      if (taskMatch && !status.last_done) {
        status.last_done = { id: taskMatch[1], title: taskMatch[2].trim() };
      }
    } else if (currentSection === '📝 pending tasks') {
      if (taskMatch) {
        status.pending.push({ id: taskMatch[1], title: taskMatch[2].trim() });
      } else if (trimmedLine !== '*Pending task extraction from specification*') {
        status.pending.push({ id: null, title: trimmedLine.replace(/^[*-]\s+/, '') });
      }
    } else if (currentSection === '🚧 blockers') {
      if (trimmedLine !== '*None*' && trimmedLine !== '*None currently identified*') {
        status.blockers.push(trimmedLine.replace(/^[*-]\s+/, ''));
      }
    }
  }

  const uniquePending = [];
  const seenPendingIds = new Set();
  for (const task of status.pending) {
    if (task.id && seenPendingIds.has(task.id)) continue;
    uniquePending.push(task);
    if (task.id) seenPendingIds.add(task.id);
  }
  status.pending = uniquePending;

  return status;
}

function parseLatestMetrics(metricsPath) {
  if (!fs.existsSync(metricsPath)) return {};
  try {
    const lines = fs.readFileSync(metricsPath, 'utf8').split('\n').reverse();
    let header = null;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('|') || !trimmedLine.endsWith('|')) continue;
      const cells = trimmedLine.split('|').map(cell => cell.trim()).slice(1, -1);

      if (trimmedLine.includes('---')) {
        if (header) {
          const metrics = {};
          header.forEach((key, index) => {
            if (cells[index] && cells[index] !== 'N/A' && cells[index] !== '') {
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_ms$/, '').replace(/_percent$/, '_rate');
              const value = cells[index];
              metrics[cleanKey] = !isNaN(parseFloat(value)) ? parseFloat(value) : value;
            }
          });
          if (metrics.date && Object.values(metrics).some(v => typeof v === 'number')) return metrics;
        }
        header = null;
      } else if (cells.length > 1 && !header) {
        header = cells;
      }
    }
  } catch (err) {
    console.warn(`Warning: Error parsing metrics file ${metricsPath}:`, err.message);
  }
  return {};
}

function detectCIStatus() {
  try {
    if (fs.existsSync('.github/workflows') && fs.readdirSync('.github/workflows').some(f => f.endsWith('.yml') || f.endsWith('.yaml'))) return 'github-actions';
    if (fs.existsSync('.gitlab-ci.yml')) return 'gitlab';
    if (fs.existsSync('Jenkinsfile')) return 'jenkins';
    if (fs.existsSync('bitbucket-pipelines.yml')) return 'bitbucket';
    if (fs.existsSync('azure-pipelines.yml')) return 'azure-devops';
  } catch (err) {
    console.warn('Warning: Error detecting CI system:', err.message);
  }
  return 'unknown';
}

function generateQuickStatus() {
  const statusData = parseProjectStatus(STATUS_FILE_PATH);
  const latestMetrics = parseLatestMetrics(METRICS_FILE_PATH);
  const specIndex = readJsonSafe(SPEC_INDEX_PATH, { stats: {} });
  const layoutData = readJsonSafe(LAYOUT_PATH, { stats: {} });
  const recentIssues = countRecentIssues(ISSUES_LOG_PATH);

  // Check if implementation directory exists
  const implementationDirExists = fs.existsSync(IMPLEMENTATION_DIR);
  
  // Count files in implementation directory if it exists
  let implementationFiles = 0;
  if (implementationDirExists) {
    try {
      const countFilesRecursively = (dirPath) => {
        let count = 0;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            count += countFilesRecursively(fullPath);
          } else if (entry.isFile()) {
            count++;
          }
        }
        return count;
      };
      implementationFiles = countFilesRecursively(IMPLEMENTATION_DIR);
    } catch (err) {
      console.warn(`Warning: Error counting files in implementation directory: ${err.message}`);
    }
  }

  const quickStatus = {
    version: '1.2',
    generated: new Date().toISOString(),
    project: {
      statusFile: STATUS_FILE_PATH,
      statusLastUpdated: statusData.lastUpdated,
      statusChecksum: getFileChecksumSafe(STATUS_FILE_PATH),
      metricsFile: METRICS_FILE_PATH,
      metricsChecksum: getFileChecksumSafe(METRICS_FILE_PATH),
      specFile: SPEC_INDEX_PATH ? specIndex?.checksum : getFileChecksumSafe('docs/spec.md')
    },
    implementation: {
      directory: IMPLEMENTATION_DIR,
      exists: implementationDirExists,
      fileCount: implementationFiles,
      requirements: specIndex?.stats?.implementationRequirements ?? 0
    },
    agentState: {
      next_task: statusData.next_task,
      last_completed_task: statusData.last_done,
      pending_tasks_count: statusData.pending.length,
      blockers: statusData.blockers,
      blockers_count: statusData.blockers.length
    },
    health: {
      ci_system: detectCIStatus(),
      requirements_total: specIndex?.stats?.totalRequirements ?? 0,
      requirements_completed: specIndex?.stats?.completedRequirements ?? 0,
      requirements_progress_percent: specIndex?.stats?.totalRequirements > 0
        ? Math.round((specIndex.stats.completedRequirements / specIndex.stats.totalRequirements) * 100)
        : 0,
      total_files: layoutData?.stats?.totalFiles ?? 0,
      total_lines_of_code: null,
      recent_issues_critical: recentIssues.critical,
      recent_issues_error: recentIssues.errors,
      recent_issues_warning: recentIssues.warnings
    },
    latest_metrics: latestMetrics,
    environment: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version
    },
    parseError: statusData.parseError || null
  };

  try {
    fs.writeFileSync(QUICK_STATUS_PATH, JSON.stringify(quickStatus, null, 2));
    console.log(`Quick status generated: ${QUICK_STATUS_PATH}
- Next Task: ${quickStatus.agentState.next_task?.id || quickStatus.agentState.next_task?.title || 'None'}
- Blockers: ${quickStatus.agentState.blockers_count}
- Req Progress: ${quickStatus.health.requirements_progress_percent}% (${quickStatus.health.requirements_completed}/${quickStatus.health.requirements_total})
- Implementation Files: ${quickStatus.implementation.fileCount}`);
  } catch (writeErr) {
    console.error(`Error writing quick status file ${QUICK_STATUS_PATH}:`, writeErr.message);
    process.exit(1);
  }
}

try {
  generateQuickStatus();
} catch (error) {
  console.error('Failed to generate quick status:', error.message, error.stack);
  process.exit(1);
}