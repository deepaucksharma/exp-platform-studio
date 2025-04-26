# Claude Session Templates

These templates provide structured approaches for different types of tasks when working with Claude. Each session type focuses on specific aspects of software development and provides guidelines for both Claude and the user.

## Available Session Types

- [Code Review](./code-review.md) - Focus on code quality, patterns, and security
- [Implementation](./implementation.md) - Creating new code based on specifications
- [Debugging](./debugging.md) - Identifying and fixing bugs
- [Architecture](./architecture.md) - Designing system structure and components

## How to Use

1. Start by telling Claude which session type you want to use: "Let's use the CODE REVIEW session template."
2. Upload the relevant session template at the beginning of your conversation.
3. Follow the structured approach defined in the template.
4. Reference the template guidelines when discussing specific aspects of your task.

## Session Commands

These commands can be used across all session types:

- `@map` - Display project structure
- `@file <path>` - Show file contents
- `@spec <id>` - Show specific requirement
- `@protocol <id>` - Reference a specific protocol
- `@summary <path>` - Get a summary of a file
- `@tag <tag>` - List all files with a specific tag

## Creating Custom Sessions

You can create your own session templates by following this structure:

```markdown
# Session: [NAME]

## Focus
- Key points of focus for this session type

## Guidelines
- Specific guidelines for Claude to follow

## Approach
1. Step 1
2. Step 2
...

## Response Format
Format that Claude should use in responses
```
