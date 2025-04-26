# DStudio Implementation

This directory contains the actual implementation of the DStudio project. All application code, tests, and implementation-specific configurations should be placed here.

## Structure

The implementation directory is designed to be self-contained. It should include:

- Application source code
- Tests
- Implementation-specific documentation
- Implementation-specific CI/CD configuration
- Build artifacts (these will be automatically ignored by the meta scripts)

## CI/CD

The implementation has its own CI/CD pipeline in the `.github/workflows` directory. This allows the implementation to have technology-specific CI/CD processes while the meta layer focuses on project structure validation.

## Getting Started

To start implementing your project:

1. Add your technology-specific files to this directory
2. Update the implementation-specific CI/CD workflow as needed
3. Make sure your main file matches one of the patterns in the `.agent-config.json` for proper language detection

## Testing

Tests should be placed within this directory structure and follow the conventions of your chosen technology stack.

## Notes

- The meta layer scripts will scan this directory for generating project layouts and file maps
- Changing the implementation should not require modifying the meta layer
- Implementation-specific dependencies should be declared in implementation-specific files (e.g., package.json, requirements.txt, etc.)
