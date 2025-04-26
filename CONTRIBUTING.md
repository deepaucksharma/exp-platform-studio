# Contributing to DStudio

Thank you for your interest in contributing to DStudio! This document provides guidelines and explains important architecture decisions that will help you work effectively in this repository.

## Repository Structure

DStudio follows a strict meta/implementation separation pattern:

- **Meta layer** (repository root): Contains project configuration, documentation, and automation scripts
- **Implementation layer** (`generated_implementation/`): Contains the actual code for all services

## Multiple Services in a Monorepo

This repository is set up as a monorepo hosting multiple independent AI agent services. Each service should be placed in its own subfolder under `generated_implementation/` (e.g., `generated_implementation/service-A`, `generated_implementation/service-B`).

## Important Notes on CI/CD

> ⚠️ **NOTE: Meta-CI is repo-wide and fails fast if ANY service breaks separation**

The repository has CI pipelines that enforce strict separation between meta and implementation layers. If any service violates this separation (e.g., by placing implementation files in the root, or meta configuration in implementation directories), the entire CI pipeline will fail, blocking all PRs.

This is by design to ensure repository integrity is maintained, but requires careful attention when adding or modifying services.

## Working with Multiple Agents

When multiple AI agents are working concurrently in this repository:

1. Each agent should use its own lock file (`.agent-lock-<agent-id>`)
2. For rollbacks, use the `--no-push` flag when running in parallel
3. Services should have their own CI workflow files in `.github/workflows/ci-<service>.yml`

## Language Support

The repository currently supports the following languages:
- JavaScript/Node.js
- Python
- Go
- Rust
- Java

## Getting Started

1. Clone the repository
2. Navigate to your service directory: `cd generated_implementation/your-service-name`
3. Follow the setup instructions in the service's README.md

## Pull Request Process

1. Make sure your service is in its own directory under `generated_implementation/`
2. Ensure you've added appropriate tests for your changes
3. Update documentation as needed
4. Create a PR with a clear description of the changes

## Questions or Issues?

If you have questions or run into issues, please open a GitHub issue with a clear description of the problem.

Thank you for contributing to DStudio!
