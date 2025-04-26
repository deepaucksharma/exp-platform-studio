# DStudio Prompt Templates

This document provides ready-to-use prompt templates for common DStudio development scenarios. Copy, customize, and use these templates to ensure consistent adherence to the meta/implementation separation.

## Template 1: Complete Development Iteration

```
Role: Developer for DStudio project

Context: I need to complete a full development iteration on the DStudio project, which follows strict separation between meta-infrastructure and implementation code.

Instructions:
1. Please read and follow these protocols thoroughly:
   - docs/prompts/separation-protocol.md
   - docs/prompts/complete-iteration-workflow.md
   - docs/prompts/verification-checklist.md
   - docs/prompts/heartbeat-protocol.md

2. Help me implement the following task:
   [Insert task description, preferably referencing a REQ-XX from spec.md]

3. Follow EVERY step in the complete-iteration-workflow.md document, including:
   - Pre-implementation planning
   - Implementation with strict separation
   - Testing of all changes
   - Running ALL verification scripts
   - Updating ALL status files
   - Preparing a proper commit

4. Maintain the heartbeat file throughout the process as described in heartbeat-protocol.md.

5. Before finalizing, verify EVERY item in the verification checklist.

6. If any issues arise, consult troubleshooting-guide.md for resolution.

Current Status: [Brief description of current project state]
```

## Template 2: Project Initialization

```
Role: Technical Lead for DStudio project

Context: I need to initialize a new project using the DStudio architecture that separates meta-infrastructure from implementation code.

Instructions:
1. Please read and follow the protocols at:
   - docs/prompts/initialization-protocol.md
   - docs/prompts/separation-protocol.md
   - docs/prompts/complete-iteration-workflow.md

2. Help me initialize a [describe type of project] project with the following requirements:
   [Insert brief project requirements]

3. Work through each phase of the initialization protocol to create:
   - A complete specification with [IMPL] tagged requirements
   - A thorough project plan and timeline
   - Technology recommendations with justification
   - Initial scaffolding in the generated_implementation/ directory

4. Follow the verification steps in verification-checklist.md before finalizing setup.

5. Remember that all implementation code MUST go in the generated_implementation/ directory.

Project Location: [local path or GitHub repository link]
```

## Template 3: Issue Resolution and Troubleshooting

```
Role: Troubleshooter for DStudio project

Context: I'm experiencing an issue with the DStudio project, which follows strict separation between meta-infrastructure and implementation code.

Instructions:
1. Please read and follow these protocols:
   - docs/prompts/separation-protocol.md
   - docs/prompts/troubleshooting-guide.md
   - docs/prompts/complete-iteration-workflow.md

2. Help me resolve the following issue:
   [Insert issue description]

3. First identify the issue category from troubleshooting-guide.md.

4. Follow the resolution steps while ensuring:
   - Strict maintenance of meta/implementation separation
   - All fixes adhere to the complete iteration workflow
   - Updates to status files reflect the fix
   - Proper verification steps are followed

5. If the issue involves improper separation:
   - Identify where separation was broken
   - Suggest corrections that restore proper separation
   - Document how to prevent similar issues in the future

6. Provide a verification plan to confirm the issue is fully resolved.

Issue Details: [Error messages, observed behavior, expected behavior, etc.]
```

## Template 4: Code Review and Refactoring

```
Role: Senior Developer for DStudio project

Context: I need to review and improve code within the DStudio project, which follows strict separation between meta-infrastructure and implementation code.

Instructions:
1. Please read and follow these protocols:
   - docs/prompts/separation-protocol.md
   - docs/prompts/complete-iteration-workflow.md
   - docs/prompts/verification-checklist.md

2. Review the following code in the generated_implementation/ directory:
   [Insert file paths or code snippets]

3. Analyze the code for:
   - Adherence to separation protocol
   - Code quality and performance
   - Test coverage
   - Documentation completeness
   - Potential improvements

4. Suggest refactoring to improve the code while:
   - Maintaining proper separation
   - Following the complete iteration workflow
   - Ensuring full test coverage of changes
   - Updating all necessary documentation

5. Before finalizing recommendations, verify against the verification checklist.

Project Context: [Brief description of what the code does]
```

## Template 5: Documentation Update

```
Role: Technical Writer for DStudio project

Context: I need to update documentation for the DStudio project, which follows strict separation between meta-infrastructure and implementation code.

Instructions:
1. Please read and follow these protocols:
   - docs/prompts/separation-protocol.md
   - docs/prompts/complete-iteration-workflow.md
   - docs/prompts/verification-checklist.md

2. Help me update documentation for:
   [Insert what needs documentation]

3. Properly separate documentation:
   - Implementation-specific docs go in generated_implementation/docs/
   - Meta-level documentation goes in docs/

4. Ensure documentation:
   - Clearly explains the meta/implementation separation
   - Provides accurate usage instructions
   - Includes helpful examples
   - Follows a consistent structure

5. After creating/updating documentation, follow the verification process.

Documentation Type: [API docs, user guide, developer docs, etc.]
```

## Template 6: Continuous Integration Setup

```
Role: DevOps Engineer for DStudio project

Context: I need to set up or modify CI/CD for the DStudio project, which follows strict separation between meta-infrastructure and implementation code.

Instructions:
1. Please read and follow these protocols:
   - docs/prompts/separation-protocol.md
   - docs/prompts/ci-cd-protocol.md (if exists)
   - docs/prompts/verification-checklist.md

2. Help me [set up/modify] the CI/CD pipeline for:
   [Insert specific CI/CD requirements]

3. Create/modify workflows that:
   - Respect the meta/implementation separation
   - Test only implementation code in generated_implementation/
   - Run appropriate verification scripts
   - Validate the separation is maintained
   - Provide clear feedback on issues

4. Ensure CI configuration:
   - Lives in appropriate meta-layer location
   - References implementation directory correctly
   - Handles different language stacks appropriately

5. Before finalizing, verify against the verification checklist.

CI/CD Requirements: [Specific pipeline requirements, tools, platforms]
```

## Using These Templates

1. Copy the appropriate template based on your task
2. Fill in the bracketed placeholders with your specific information
3. Add or remove details as needed for your situation
4. Use the prompt with Claude or another AI assistant
5. Ensure the AI follows ALL steps in the referenced protocols

## Important Guidelines

1. Always include ALL relevant protocol references
2. Be specific about what needs to be done
3. Emphasize complete iteration workflow adherence
4. Require verification before finalization
5. Maintain heartbeat throughout long operations

Remember: The separation between meta-infrastructure and implementation code is MANDATORY and must be maintained at all times.