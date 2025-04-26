# DStudio Agent Status Directory

This directory stores individual agent status files that are merged into the main project status by the `merge-agent-status.js` script.

## Purpose

The status directory enables multiple AI agents to work concurrently in the repository while maintaining their own status reports. These individual reports are then combined into a comprehensive project status.

## File Format

Status files should follow the naming convention:
```
status-{agent-id}.md
```

For example:
- `status-agent1.md`
- `status-code-assistant.md`
- `status-deployment-agent.md`

## Content Format

Each status file should contain Markdown-formatted content that includes:

1. An agent identifier (typically as a level 2 heading)
2. Current status information
3. Completed and pending tasks
4. Any notes or observations

Example format:
```markdown
## Agent: deployment-agent

### Current Status
Working on CI/CD pipeline optimization.

### Completed Tasks
- [x] Updated GitHub Actions workflows
- [x] Fixed caching issues
- [x] Added service-specific CI templates

### Pending Tasks
- [ ] Implement auto-deployment
- [ ] Add monitoring hooks
- [ ] Set up staging environments

### Notes
Found several inefficiencies in the build process that could be optimized.
```

## Merging Process

The individual status files are automatically merged into the main `project-status.md` file in the project root when the following command is run:

```bash
npm run merge:status
```

This command executes the `scripts/merge-agent-status.js` script which:

1. Reads all status files from this directory
2. Preserves the existing header in the main status file
3. Orders status entries by last modification time (most recent first)
4. Adds proper section formatting and separators
5. Updates the timestamp in the header

## Working with Multiple Agents

When multiple AI agents are working concurrently:

1. Each agent should use its own lock file (`.agent-lock-<agent-id>`)
2. Each agent should maintain its own status file in this directory
3. Agents should run the merge script after updating their status

This approach prevents conflicts and provides a clean way to track agent activities.

## Integration with Utilities

The status management system uses the standardized utility modules from the `/utils` directory:

- File operations via `utils.file`
- Path handling via `utils.path`
- Error handling via `utils.error`
- Project-specific functions via `utils.project`

To create or update a status file programmatically, use the utility function:

```javascript
utils.project.createAgentStatus('agent-id', statusContent);
```
