# DStudio Documentation Index

This document serves as a central navigation point for all DStudio documentation.

## Core Documentation

- [Project Overview](../README.md) - Overview of DStudio, architecture, and getting started
- [Meta/Implementation Separation](META-IMPLEMENTATION-SEPARATION.md) - Details on the core architectural pattern
- [Project Status](../project-status.md) - Current project status and progress
- [Retrospective](../retrospective.md) - Development history and lessons learned

## Development Protocols

- [Separation Protocol](protocol/separation-protocol.md) - Rules for maintaining meta/implementation separation
- [Coding Standards](protocol/claude-protocol.md) - Coding standards and best practices

## Project Metrics and Specifications

- [Metrics](metrics.md) - Project progress metrics and KPIs
- [Specifications](spec.md) - Detailed project requirements and specifications

## Implementation

- [Implementation Guide](../generated_implementation/README.md) - Guide to working with the implementation layer
- [Language Templates](#language-templates) - Available language templates for implementation

## Scripts and Tools

- [Health Check](../scripts/health-check.js) - Validates project structure and separation
- [Setup](../scripts/setup.js) - Sets up project directory structure
- [Cache Cleanup](../scripts/cache-cleanup.js) - Manages the .cache directory

## Language Templates

DStudio supports multiple programming languages through templates:

- [JavaScript/Node.js](../generated_implementation/templates/js/README.md) - Express-based web application
- [Python (with requirements.txt)](../generated_implementation/templates/python-pkg/README.md) - Flask-based web application
- [Python (with pyproject.toml)](../generated_implementation/templates/python-pyproject/README.md) - Modern Python packaging
- [Go](../generated_implementation/templates/go-pkg/README.md) - Gin-based web service
- [Rust](../generated_implementation/templates/rust-pkg/README.md) - Rust web application

## CI/CD

- [Meta CI](../.github/workflows/meta-ci.yml) - CI/CD for the meta layer
- [Implementation CI](../generated_implementation/.github/workflows/implementation-ci.yml) - CI/CD for the implementation layer

## Contributing

- [Issue Reporting](../CONTRIBUTING.md#reporting-issues) - How to report issues
- [Development Workflow](../CONTRIBUTING.md#development-workflow) - Workflow for contributing code
