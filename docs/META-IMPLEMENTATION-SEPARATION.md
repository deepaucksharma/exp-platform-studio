# Meta/Implementation Separation in DStudio

This document explains the core architectural principle of separating the meta layer from the implementation layer in DStudio projects.

## Overview

DStudio follows a strict separation between two distinct layers:

1. **Meta Layer** (Root Directory): Contains configuration, tooling, and infrastructure that manages the development process.

2. **Implementation Layer** (`generated_implementation/` Directory): Contains the actual application code, tests, and implementation-specific configurations.

This separation ensures that the meta layer can evolve independently of the implementation layer, making it easier to maintain, upgrade, and reason about the project structure.

## Directory Structure

```
DStudio/
├── .agent-config.json        # Meta: Core configuration
├── .github/                  # Meta: CI/CD for meta layer
│   └── workflows/
│       └── meta-ci.yml       # Meta-only CI workflow
├── docs/                     # Meta: Documentation
│   ├── protocol/             # Development protocols
│   └── ...                   # Other documentation
├── scripts/                  # Meta: Utility scripts
│   ├── config-utils.js       # Path and configuration utilities
│   ├── health-check.js       # Structure validation
│   └── ...                   # Other scripts
├── project-status.md         # Meta: Project status
├── README.md                 # Meta: Project overview
└── generated_implementation/ # Implementation layer root
    ├── .github/              # Implementation-specific CI/CD
    │   └── workflows/
    │       └── implementation-ci.yml
    ├── src/                  # Application source code
    ├── tests/                # Tests
    ├── README.md             # Implementation documentation
    └── {language-specific files}  # e.g., package.json, go.mod
```

## Key Files

### Meta Layer

- `.agent-config.json`: Core configuration defining the project structure, language detection patterns, and other settings.
- `scripts/config-utils.js`: Utility functions for accessing configuration and paths consistently.
- `scripts/health-check.js`: Validates the meta/implementation separation.

### Implementation Layer

- Language-specific configuration files (e.g., `package.json`, `go.mod`)
- Source code directories
- Test files
- Implementation-specific CI/CD workflows

## Rules of Separation

1. **No Tech Stack Files in Root**:
   - All language-specific files must be in the implementation directory
   - No build artifacts in the root directory

2. **Meta Layer Does Not Depend on Implementation**:
   - Meta scripts should work regardless of the technology stack in the implementation
   - Meta layer should not import or directly use implementation code

3. **Path References Must Use Configuration**:
   - Scripts should always use `config-utils.js` for path handling
   - Avoid hardcoded paths that cross layer boundaries

## CI/CD Separation

DStudio maintains separate CI/CD workflows for each layer:

1. **Meta CI** (`.github/workflows/meta-ci.yml`):
   - Validates project structure
   - Ensures meta/implementation separation
   - Triggers implementation CI when appropriate

2. **Implementation CI** (`generated_implementation/.github/workflows/implementation-ci.yml`):
   - Handles language-specific testing and building
   - Adapts to the specific technology stack in use

## Benefits

This separation provides several key benefits:

1. **Technology Independence**: The meta layer works with any technology stack in the implementation.

2. **Clear Boundaries**: Developers (and AI agents) know exactly where to place files.

3. **Independent Evolution**: The meta layer can be updated without affecting implementation code.

4. **Rollback Safety**: Implementation changes can be rolled back without affecting the meta layer.

5. **Simplified Maintenance**: Each layer has a clear responsibility, making it easier to maintain.

## Working with the Separation

When working on the project, follow these guidelines:

1. **Use the Health Check**: Run `npm run health-check` regularly to ensure proper separation.

2. **Path References**: Always use `config-utils.js` for path handling in scripts.

3. **CI Configuration**: Keep meta and implementation CI workflows separate.

4. **Technology Selection**: Add new technology stack files only in the implementation directory.

## Common Pitfalls

1. **Installing Dependencies in Wrong Location**: Always install implementation dependencies from the implementation directory.

2. **Hardcoding Paths**: Avoid hardcoding `generated_implementation` in scripts or config files.

3. **Cross-Layer Dependencies**: Avoid making the meta layer depend on implementation-specific features.

4. **Duplicate Configuration**: Don't duplicate configuration between layers - meta layer should be the single source of truth for project-wide settings.

## Tools for Maintaining Separation

- `npm run health-check`: Validates the meta/implementation separation
- `npm run setup`: Sets up the project structure correctly
- `npm run cache:clean`: Cleans up cache files
