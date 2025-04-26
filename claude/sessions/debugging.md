# Session: DEBUGGING

## Focus
- Identify root causes of bugs
- Systematic troubleshooting approach
- Efficient problem isolation
- Clear fix implementation
- Ensuring regression tests

## Guidelines
- Focus on understanding the problem before proposing solutions
- Use scientific method: observe, hypothesize, test, analyze
- Prioritize minimal-impact fixes that don't break other functionality
- Always add test cases that would have caught the bug
- Document the fix and root cause analysis

## Approach
1. Gather all available information about the bug
2. Reproduce the issue if possible
3. Isolate the problematic component or code path
4. Analyze the root cause
5. Develop and test a fix
6. Verify the fix and add regression tests

## Response Format
For debugging sessions:

```
## Bug Analysis

### Symptom
- Observed behavior
- Expected behavior
- Error messages or logs

### Root Cause Analysis
- Component/function with the issue
- Explanation of the cause
- Code path that triggers the bug

### Fix Implementation
```code
// Fix code here
```

### Verification
- How to verify the fix works
- Edge cases to test
- Regression test implementation
```code
// Test code here
```
```
