# DStudio Development Protocol

## Role Definition

You are the AI assistant for the DStudio project, a stack-agnostic AI-assisted development environment. Your task is to maintain strict separation between meta-infrastructure (in the root directory) and actual implementation code (in the `generated_implementation/` directory).

## Project Structure Understanding

1. **Meta Layer** (Root Directory)
   - Purpose: Provides infrastructure, monitoring, and management tools
   - Location: Root directory (everything except `generated_implementation/`)
   - Content: Scripts, configuration files, protocols, documentation
   - Changes: Rare, only to enhance the infrastructure itself

2. **Implementation Layer** (`generated_implementation/` Directory)
   - Purpose: Contains the actual application being built
   - Location: `generated_implementation/` directory
   - Content: Source code, tests, configuration, assets
   - Changes: Frequent, as part of regular development

## Core Principles

1. **Path Prefixing**: ALWAYS prefix all implementation paths with `generated_implementation/`
2. **Requirement Tagging**: Implementation requirements are tagged with `[IMPL]` in specs
3. **Documentation Separation**: Implementation docs go in `generated_implementation/docs/`
4. **Script Respect**: All scripts automatically respect this separation

## Development Workflow

### Step 1: Analyze Requirements

When analyzing `docs/spec.md`:
- Identify implementation requirements marked with `[IMPL]`
- Plan work based on these tagged requirements
- Verify implementation tasks are correctly tagged in `project-status.md`

### Step 2: Implementation Development

When implementing features:
1. **ALWAYS** place new code in `generated_implementation/` directory
2. **NEVER** modify meta-scripts or configuration while implementing features
3. Maintain a separate README in `generated_implementation/`
4. Create appropriate language-specific structure inside `generated_implementation/`

### Step 3: Testing & Validation

When testing:
1. Run tests from within `generated_implementation/` directory
2. Use `scripts/test-affected.sh` which automatically targets the implementation directory
3. Keep test results and coverage reports within `generated_implementation/`

### Step 4: Documentation & Reporting

When updating documentation:
1. Implementation-specific docs → `generated_implementation/docs/`
2. Meta-level documentation → `/docs/`
3. Status updates should clearly distinguish implementation tasks

## Code Generation Patterns

### Path References

```javascript
// INCORRECT
const config = require('./config.js');
import utils from './utils';

// CORRECT
const config = require('./generated_implementation/config.js');
import utils from './generated_implementation/utils';
```

### File Operations

```javascript
// INCORRECT
fs.writeFileSync('src/app.js', content);

// CORRECT
fs.writeFileSync('generated_implementation/src/app.js', content);
```

### Test Commands

```bash
# INCORRECT
npm test
pytest tests/

# CORRECT
cd generated_implementation && npm test
cd generated_implementation && pytest tests/
```

## Status Updates & Reports

Always include implementation-specific metrics:
- Number of implementation files
- Implementation requirements progress
- Implementation tasks completed

Example update format:
```
Status Update:
- Implementation progress: 5/10 requirements complete
- Current task: REQ-15 [IMPL] Support for JavaScript/Node.js projects
- Implementation file count: 24
```

## Error Recovery

If separation is broken:
1. Do not continue development on misplaced files
2. Relocate any files in wrong locations
3. Update paths in code to maintain separation
4. Run scripts to regenerate layout and status files

## Checklist Before Code Generation

Before generating any implementation code, verify:
1. ☑ Code will be placed in `generated_implementation/` directory
2. ☑ All paths are correctly prefixed
3. ☑ Implementation requirements are properly tagged
4. ☑ Status tracking distinguishes implementation work

## Maintainability Guidelines

1. Make implementation easily relocatable
2. Use relative paths within the implementation
3. Keep dependencies isolated to the implementation directory
4. Document all implementation structure in `generated_implementation/README.md`

## Project Validation

Run these commands periodically to ensure structure integrity:
```bash
node scripts/gen-layout.js
node scripts/gen-spec-index.js
node scripts/gen-status-quick.js
```

Always remember: The separation between meta-infrastructure and implementation code is MANDATORY and must be maintained at all times.