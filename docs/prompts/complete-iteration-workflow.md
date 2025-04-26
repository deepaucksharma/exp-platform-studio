# Complete DStudio Iteration Workflow

This document outlines the comprehensive step-by-step process an AI agent must follow for each development iteration in the DStudio architecture, ensuring proper separation between meta and implementation layers.

## Pre-Implementation Phase

### 1. Task Selection & Analysis
- Read `project-status.md` to identify the current/next task
- Verify task has appropriate [IMPL] tag if it's implementation-related
- Read relevant requirements in `docs/spec.md`
- Check `spec.index.json` for related requirements

### 2. Environment Assessment
- Run `node scripts/gen-status-quick.js` to get current project state
- Check `status.quick.json` to understand overall progress
- Verify implementation directory structure with `node scripts/gen-layout.js`
- Check for recent changes with `node scripts/update-checksum-cache.js`

### 3. Planning
- Design solution that maintains meta/implementation separation
- Identify all files that will need to be created or modified
- Verify all implementation paths start with `generated_implementation/`
- Determine tests that will be needed

## Implementation Phase

### 4. Code Generation
- Create/modify ONLY files within `generated_implementation/` directory
- Follow language-specific conventions for the implementation
- Add appropriate documentation within implementation files
- Always use relative paths WITHIN the implementation directory

### 5. Testing (Critical)
For JavaScript/Node.js projects:
```bash
cd generated_implementation
npm test
# OR for specific tests
cd generated_implementation && npm test -- --testPathPattern=path/to/test
```

For Python projects:
```bash
cd generated_implementation
pytest
# OR for specific tests
cd generated_implementation && pytest tests/specific_test.py
```

For Go projects:
```bash
cd generated_implementation
go test ./...
# OR for specific package
cd generated_implementation && go test ./package/...
```

For other languages, use appropriate test commands from within the implementation directory.

### 6. Affected Component Testing
- Run `./scripts/test-affected.sh` to test only affected components
- Fix any test failures before proceeding
- Verify code coverage meets threshold (typically ≥90%)

## Verification Phase

### 7. Structure Verification (Required after EVERY change)
After ANY implementation change, run these commands:
```bash
node scripts/gen-layout.js
node scripts/gen-spec-index.js
node scripts/gen-file-map.js
node scripts/gen-status-quick.js
```

### 8. Integrity Check
- Verify all implemented requirements maintain [IMPL] tags
- Confirm all generated files are in the correct locations
- Ensure no implementation code exists outside `generated_implementation/`
- Check `project-layout.json` to confirm structure is correct

## Documentation & Status Update Phase

### 9. Implementation Documentation
- Update `generated_implementation/README.md` if needed
- Add/update documentation in `generated_implementation/docs/` if appropriate
- Ensure API documentation is complete and accurate

### 10. Status Updates (Required)
- Update `project-status.md` with:
  - Move completed tasks from "Current" to "Completed Tasks"
  - Update "Current Iteration" with next task
  - Adjust "Blockers" section if any were resolved or discovered
  
- Update `docs/metrics.md` with new metrics:
  - Add a new row with current date
  - Update requirements completion stats
  - Record any performance metrics

### 11. Dependency Check
- Review related files that might need updates based on changes
- Check if database schemas need migration
- Verify configuration files are consistent
- Ensure shared components reflect new changes

## Commit Phase

### 12. Commit Preparation
- Generate updated status files:
  ```bash
  node scripts/gen-status-quick.js
  ```
- Review all changes one final time

### 13. Commit Creation
- Create commit with standardized message format:
  ```
  type(scope): description
  
  [optional body]
  
  Refs: REQ-XX
  ```
  
  Types: feat, fix, docs, style, refactor, test, chore
  Scope: area of implementation affected
  
  Example:
  ```
  feat(auth): implement user registration API
  
  - Add endpoint for user creation
  - Implement validation and error handling
  - Set up password hashing
  
  Refs: REQ-4
  ```

### 14. Post-Commit Verification
- Verify commit includes all necessary files
- Check that no meta-layer files were inadvertently modified
- Confirm implementation-only changes are isolated to `generated_implementation/`

## Recovery Phase (If Needed)

### 15. Error Recovery
If issues are detected after commit:
- Use `./scripts/rollback.sh <COMMIT_SHA>` for critical issues
- For minor issues, create a new fix commit
- Update `issues.log` with any errors encountered

## Next Iteration Setup

### 16. Prepare for Next Task
- Update `.agent-lock` file to maintain heartbeat
- Review upcoming tasks in `project-status.md`
- Read requirements for next task
- Run `node scripts/gen-status-quick.js` to refresh status

---

**IMPORTANT**: EVERY iteration MUST follow ALL these steps in the exact order shown. No exceptions.

- ALL implementation code MUST be in `generated_implementation/`
- EVERY change MUST be tested
- Structure verification scripts MUST be run after ANY change
- Status files MUST be updated after each task completion
- Commit messages MUST follow the standard format