# DStudio Prompt Protocols

This directory contains standardized prompts and protocols for use with the DStudio architecture. These protocols ensure consistent development practices that maintain the separation between meta-infrastructure and implementation code.

## Available Protocols

| Protocol | Purpose | Path |
|----------|---------|------|
| Separation Protocol | Enforces meta/implementation separation | `docs/prompts/separation-protocol.md` |
| Initialization Protocol | Guides project setup and planning | `docs/prompts/initialization-protocol.md` |
| Complete Workflow | Comprehensive step-by-step iteration process | `docs/prompts/complete-iteration-workflow.md` |
| Verification Checklist | Pre-commit verification steps | `docs/prompts/verification-checklist.md` |
| Troubleshooting Guide | Solutions for common issues | `docs/prompts/troubleshooting-guide.md` |
| Heartbeat Protocol | Maintaining the agent heartbeat mechanism | `docs/prompts/heartbeat-protocol.md` |
| Example Project | Sample project demonstrating patterns | `docs/prompts/example-project.md` |
| GitHub Usage | Using protocols with GitHub repositories | `docs/prompts/github-usage.md` |
| Prompt Templates | Ready-to-use prompt templates | `docs/prompts/prompt-templates.md` |

## How to Use These Protocols

### 1. For Local Development

Include these protocols in your prompts to Claude by referencing their file paths:

```
Please read the protocols at the following paths:
- docs/prompts/separation-protocol.md
- docs/prompts/complete-iteration-workflow.md
- docs/prompts/verification-checklist.md

Then, help me [specific task] following these protocols.
```

### 2. For Remote Development

If working with a GitHub repository, reference the raw files:

```
Please read the DStudio protocols at:
- https://raw.githubusercontent.com/username/DStudio/main/docs/prompts/separation-protocol.md
- https://raw.githubusercontent.com/username/DStudio/main/docs/prompts/complete-iteration-workflow.md
- https://raw.githubusercontent.com/username/DStudio/main/docs/prompts/verification-checklist.md

Then, help me [specific task] following these protocols.
```

## Protocol Combinations

Different tasks require different protocol combinations:

1. **New Project Setup**:
   - initialization-protocol.md
   - separation-protocol.md

2. **Development Iteration**:
   - separation-protocol.md
   - complete-iteration-workflow.md
   - verification-checklist.md
   - heartbeat-protocol.md

3. **Troubleshooting Issues**:
   - separation-protocol.md
   - troubleshooting-guide.md

4. **Learning the Pattern**:
   - example-project.md
   - separation-protocol.md

## Sample Prompt Template

```
Role: Technical Lead for DStudio project

Context: I'm working on a project using the DStudio architecture that separates meta-infrastructure from implementation code.

Instructions:
1. First, please read and internalize the protocols at:
   - docs/prompts/separation-protocol.md
   - docs/prompts/complete-iteration-workflow.md
   - docs/prompts/verification-checklist.md

2. Help me [specific task] while strictly following the complete iteration workflow.

3. Remember that all implementation code MUST go in the generated_implementation/ directory.

4. When complete, use the verification checklist to confirm all steps have been followed.

Project Location: [local path or GitHub repository link]
```

## Extending These Protocols

When extending these protocols:

1. Create new protocol files in this directory
2. Add them to the table in this README
3. Update the protocol combinations section
4. Ensure all protocols maintain the meta/implementation separation

## Feedback and Improvements

These protocols are designed to evolve. If you find areas for improvement, please:

1. Document the issue or enhancement
2. Create a specific example demonstrating the problem
3. Propose a solution that maintains the meta/implementation separation

---

**Remember**: The separation between meta-infrastructure and implementation code is MANDATORY and must be maintained at all times.