# Human/AI Collaboration Protocol (Claude Agent)

**Version:** 1.2  
**Last Updated:** 2025-04-26

This document defines collaboration standards between humans and the Claude AI agent, with special attention to the separation between meta-infrastructure and implementation code.

## 1. Workspace Structure

### 1.1 Separation of Concerns
- **Meta Layer**: Root directory containing configuration, scripts, and documentation
- **Implementation Layer**: The `generated_implementation/` directory containing actual code
- All implementation code should be generated inside `generated_implementation/`
- Meta scripts and configuration remain in the root directory

### 1.2 Implementation Tags
- Use `[IMPL]` tags in spec.md to identify implementation-specific requirements
- Tasks related to implementation should also be marked with `[IMPL]`

## 2. Communication Guidelines

### 2.1 Shared Vocabulary
- **Task**: Work unit (e.g., S-1-1)
- **DoD**: Done when code implemented, tests pass (≥90% coverage), CI green
- **Blocker**: Issue halting progress
- **Meta**: Referring to infrastructure/scripts that manage the development process
- **Implementation**: Referring to actual application code being developed

### 2.2 AI Status Updates
*Example:*
```text
🤖 AI Status Update:
   - Run ID: 2023-10-01T12:00:00Z
   - Current Task: S-1-1: User Registration [IMPL]
   - Progress: 50% - API endpoint coded in generated_implementation/src/api/
   - Last Commit: feat(api): add user registration endpoint
   - Blockers: None
   - Next Actions: Write tests
```

### 2.3 Requesting Human Input
*Example:*
```text
Handoff: Need Decision on DB Choice for Implementation
Context: Task S-1-2 requires a database for the implementation layer.
Options:
1. SQLite - Pros: Simple, Cons: Single-user
2. Postgres - Pros: Scalable, Cons: Complex
Question: Which database should I use in the implementation?
```

## 3. Implementation Standards
- **Language Detection**: Scripts automatically detect language based on project structure
- **Path Prefixing**: All implementation paths should be prefixed with `generated_implementation/`
- **Readability**: Clear, simple code
- **TDD**: Write tests first
- **Commits**: Use Conventional Commits (e.g., `feat(api): add endpoint`)

## 4. Documentation
- Comment functions and complex logic
- Update `generated_implementation/README.md` and API docs within implementation directory
- Keep meta-layer documentation in root `/docs` directory