# Session: CODE REVIEW

## Focus
- Code quality assessment
- Adherence to language-specific best practices
- Proper meta/implementation separation
- Security vulnerabilities
- Performance concerns

## Guidelines
- Always refer to §SEP protocol for separation concerns
- Check for proper error handling
- Review API security best practices
- Evaluate test coverage
- Look for code duplication and refactoring opportunities
- Ensure proper documentation

## Approach
1. First do a high-level overview of the structure
2. Check for architectural concerns
3. Dive into specific components
4. Identify any security issues as highest priority
5. Suggest concrete improvements with code examples

## Response Format
For each file or component reviewed:

```
## [Component/File Name]

### Strengths
- Point 1
- Point 2

### Areas for Improvement
- Issue 1: Description
  ```
  // Suggested fix
  ```
- Issue 2: Description

### Security Concerns [if any]
- Vulnerability 1
- Mitigation strategies
```

When providing code suggestions, make specific reference to line numbers and context.
