# DStudio Troubleshooting Guide

This guide helps address common issues that may arise during the DStudio development process, with a focus on maintaining the critical separation between meta and implementation layers.

## Meta/Implementation Separation Issues

### Issue: Implementation Files Created in Wrong Location

**Symptoms:**
- Files that should be in `generated_implementation/` are in the root or another directory
- Structure verification shows unexpected files

**Resolution:**
1. Identify all misplaced files
2. Create proper directory structure in `generated_implementation/`
3. Move all content to correct locations
4. Update any references to these files
5. Remove the misplaced files
6. Run verification scripts:
   ```bash
   node scripts/gen-layout.js
   node scripts/gen-status-quick.js
   ```

### Issue: Meta-Layer Files Modified During Implementation

**Symptoms:**
- Changes to scripts/, docs/ (except implementation docs), or config files
- Unexpected modifications to status files

**Resolution:**
1. Use `git status` to identify modified meta files
2. Revert changes to meta files:
   ```bash
   git checkout -- path/to/meta/file
   ```
3. If changes were necessary, create separate commits specifically for meta changes
4. Run verification scripts to regenerate status files

## Testing Issues

### Issue: Tests Failing After Implementation

**Symptoms:**
- Test failures when running test commands
- CI pipeline failures
- Failed checks in verification phase

**Resolution:**
1. Identify failing tests and the root cause
2. For implementation issues, modify implementation code to fix the issue
3. For test issues, update tests to correctly verify functionality
4. Run tests again to verify resolution:
   ```bash
   cd generated_implementation
   npm test  # or appropriate test command for your language
   ```
5. If tests cannot be fixed immediately, document the issue in `project-status.md` under Blockers

### Issue: Missing Test Coverage

**Symptoms:**
- Coverage reports showing < 90% coverage
- Functionality without corresponding tests

**Resolution:**
1. Identify uncovered code paths
2. Write additional tests to cover missing scenarios
3. Re-run tests with coverage reporting
4. Verify coverage meets or exceeds threshold

## Status Management Issues

### Issue: Inconsistent Status Files

**Symptoms:**
- Discrepancies between `project-status.md` and actual code state
- Outdated or incorrect metrics in `metrics.md`
- Wrong information in `status.quick.json`

**Resolution:**
1. Update `project-status.md` to reflect actual progress
2. Run generator scripts to synchronize status:
   ```bash
   node scripts/gen-spec-index.js
   node scripts/gen-layout.js
   node scripts/gen-status-quick.js
   ```
3. Manually update `docs/metrics.md` with correct values
4. Verify consistency between all status files

### Issue: Missing Implementation Tags in Requirements

**Symptoms:**
- Implementation requirements not identified in `spec.index.json`
- Missing [IMPL] tags in requirements that should have them

**Resolution:**
1. Review `docs/spec.md` and add [IMPL] tags to implementation-related requirements
2. Update section headings for implementation sections with [IMPL] tags
3. Run spec indexer to update stats:
   ```bash
   node scripts/gen-spec-index.js
   ```
4. Verify tags appear correctly in generated `spec.index.json`

## Script Execution Issues

### Issue: Generator Script Errors

**Symptoms:**
- Error messages when running gen-layout.js, gen-spec-index.js, etc.
- Incomplete or corrupted output files

**Resolution:**
1. Check error messages for specific issues
2. For file not found errors:
   - Ensure all required files exist
   - Check file permissions
3. For parsing errors:
   - Verify format of source files (spec.md, etc.)
   - Fix any malformed content
4. For dependency errors:
   - Check if Node.js is installed
   - Install any missing dependencies
5. Rerun the scripts after fixing issues

### Issue: Watchdog Detecting Stale Lock

**Symptoms:**
- Messages about stale `.agent-lock` file
- Backup of lock file created in `.cache/stale-locks/`

**Resolution:**
1. Check if any AI agent process is still running
2. If not, allow watchdog to remove stale lock
3. Re-create the lock file with current information:
   ```javascript
   const fs = require('fs');
   fs.writeFileSync('.agent-lock', JSON.stringify({
     agent: "Claude",
     sessionId: `session-${Date.now()}`,
     timestamp: new Date().toISOString(),
     status: "active",
     currentTask: "current-task-id"
   }, null, 2));
   ```
4. Verify watchdog recognizes the new lock file

## Recovery Procedures

### Issue: Need to Rollback a Problematic Commit

**Symptoms:**
- Tests failing after recent commit
- Broken functionality
- Structure violations detected after commit

**Resolution:**
1. Use the rollback script with the commit hash:
   ```bash
   ./scripts/rollback.sh <SHA_TO_REVERT> "Reason for rollback"
   ```
2. The script will:
   - Revert the commit
   - Reinstall dependencies 
   - Run tests
   - Push the revert commit
3. Verify system is back to working state
4. Document the issue in `issues.log`

### Issue: Corrupted Implementation Structure

**Symptoms:**
- Severe disorganization in the implementation directory
- Multiple overlapping implementations
- Broken references between files

**Resolution:**
1. If recoverable:
   - Create temporary backup of current implementation
   - Restructure implementation directory following proper patterns
   - Move valid code to correct locations
   - Update all references
2. If not easily recoverable:
   - Save backup of current implementation
   - Revert to last known good state
   - Incrementally reapply changes with proper structure
3. Run full verification suite after restructuring

## Prevention Measures

To prevent future issues:
1. **Always** follow the complete iteration workflow
2. Use the verification checklist before every commit
3. Run generator scripts after every significant change
4. Maintain strict separation between meta and implementation layers
5. Keep the `.agent-lock` file updated during active sessions

---

If you encounter an issue not covered in this guide, document it in `issues.log` and address it systematically while maintaining the meta/implementation separation.