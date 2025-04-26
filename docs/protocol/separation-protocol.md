# Meta/Implementation Separation Protocol

This document defines the strict separation between the meta layer and implementation layer in DStudio projects.

## Core Principles

1. **Single Responsibility**: Each layer has a distinct responsibility
2. **Clear Boundaries**: Files belong to either meta or implementation, never both
3. **Path Independence**: No hardcoded paths that cross boundaries
4. **Configuration Driven**: All cross-layer references use configuration variables
5. **Independent CI/CD**: Separate CI/CD workflows for each layer

## Layer Definitions

### Meta Layer (Root Directory)

The meta layer is responsible for:

- Project structure and organization
- Monitoring and status tracking
- Specification and requirements management
- Documentation
- Meta-level utilities and scripts

**Key Files & Directories**:
- `.agent-config.json`: Core configuration
- `project-layout.json`: Implementation structure map
- `project-status.md`: Current project status
- `spec.index.json`: Parsed specification
- `scripts/`: Utility scripts
- `docs/`: Documentation
- `.github/workflows/meta-ci.yml`: Meta-level CI

### Implementation Layer (`generated_implementation/` Directory)

The implementation layer is responsible for:

- Application code
- Implementation tests
- Implementation-specific configuration
- Implementation-specific documentation
- Build artifacts

**Key Files & Directories**:
- Language-specific files (`package.json`, `go.mod`, etc.)
- Source code directories
- Test files
- Implementation-specific `.github/workflows/`

## Rules of Separation

1. **No Implementation Files in Root**:
   - All language-specific files must be in the implementation directory
   - No build artifacts in root directory
   - No tech stack specific configuration in root

2. **No Meta in Implementation**:
   - Don't duplicate meta configuration in implementation
   - Don't modify meta files from implementation code

3. **Path References**:
   - Always use config-based paths
   - Never hardcode cross-layer paths
   - Use relative paths within a layer

4. **Configuration**:
   - Meta configuration in `.agent-config.json`
   - Implementation configuration in implementation-specific files

5. **CI/CD Separation**:
   - Meta CI only validates structure and separation
   - Implementation CI handles language-specific testing and building

## Enforcement

- The `health-check.js` script validates this separation
- CI/CD pipelines enforce separation on commits
- Utility functions prevent accidental violations

## Practical Examples

### ✅ Correct Examples:

```javascript
// Using config-based paths
const implDir = utils.getImplementationDir();
const sourceFile = path.join(implDir, 'src', 'main.js');
```

```bash
# Changing to implementation directory first
cd $(node -e "console.log(require('./.agent-config.json').workspace.implementationDir)")
npm test
```

### ❌ Incorrect Examples:

```javascript
// Hardcoded paths
const sourceFile = path.join('generated_implementation', 'src', 'main.js');
```

```bash
# Running commands in wrong directory
npm test # In root directory instead of implementation
```

## Collaboration Protocol

When working with AI assistants:

1. Always reference this separation protocol
2. Explicitly state which layer you're working with
3. Ask the assistant to validate separation compliance

## Rationale

This strict separation provides several benefits:

- **Maintainability**: Changes to one layer don't affect the other
- **Rollback Safety**: Implementation can be rolled back without affecting meta
- **Clarity**: Clear responsibility boundaries for different team members
- **AI Collaboration**: Clear guidelines for AI agents
