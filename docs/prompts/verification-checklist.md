# DStudio Verification Checklist

This checklist must be used by AI agents to verify that all steps have been properly completed before finalizing any task. Copy this checklist and mark each item as you complete your work.

## Pre-Commit Verification Checklist

```markdown
### Structure Verification
- [ ] All implementation code is ONLY in `generated_implementation/` directory
- [ ] No implementation code exists outside the implementation directory
- [ ] All file paths in implementation use relative paths (not absolute)
- [ ] Implementation directory structure follows language conventions

### Testing Verification
- [ ] All new/modified code has corresponding tests
- [ ] All tests have been run and pass
- [ ] Test coverage meets minimum threshold (≥90%)
- [ ] Affected components have been tested with `scripts/test-affected.sh`

### Documentation Verification
- [ ] Implementation-specific documentation exists in `generated_implementation/docs/`
- [ ] Code includes appropriate comments and documentation
- [ ] API documentation is complete (if applicable)
- [ ] READMEs are updated to reflect new functionality

### Status Update Verification
- [ ] `project-status.md` has been updated
- [ ] Completed task moved to "Completed Tasks" section
- [ ] Next task set in "Current Iteration" section
- [ ] `docs/metrics.md` updated with latest stats
- [ ] Generator scripts have been run:
  - [ ] `node scripts/gen-layout.js`
  - [ ] `node scripts/gen-spec-index.js`
  - [ ] `node scripts/gen-file-map.js` 
  - [ ] `node scripts/gen-status-quick.js`

### Dependency Verification
- [ ] All related files have been updated for consistency
- [ ] Configuration files reflect new changes (if needed)
- [ ] Schema migrations are included (if applicable)
- [ ] Shared components are updated (if applicable)

### Commit Preparation
- [ ] Commit message follows standard format
- [ ] Commit references relevant requirement ID(s)
- [ ] Commit contains all necessary files
- [ ] No debugging/temporary code remains
```

## Common Issues to Check

### Implementation Boundary Issues
- No hardcoded paths to the implementation from meta layer
- No meta layer files modified during implementation
- All imports/requires use correct paths with `generated_implementation/` prefix

### Testing Issues
- Tests are not just checking functionality exists but validating it works correctly
- Edge cases and error scenarios are tested
- Tests don't rely on external services without mocking

### Documentation Issues
- Documentation distinguishes between meta and implementation concerns
- API documentation includes examples
- Setup instructions are clear and complete

### Status Issues
- Status reflects actual progress (not aspirational)
- Blockers are clearly documented
- Metrics accurately reflect current state

## Final Verification Statement

```
I confirm that I have completed all items in the verification checklist. The implementation:
1. Maintains strict separation between meta and implementation layers
2. Includes proper testing with passing results
3. Has complete and accurate documentation
4. Has updated all status files
5. Is ready to commit with a properly formatted message

The completed requirement(s): [List requirements completed]
```

Include this statement when submitting completed work. If any checklist item cannot be completed, explain why and describe the mitigation plan.