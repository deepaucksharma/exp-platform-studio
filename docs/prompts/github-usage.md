# Using DStudio Prompt Protocols with GitHub

This guide explains how to reference DStudio protocols hosted in a GitHub repository for consistent AI-assisted development.

## GitHub Repository Setup

1. Host your DStudio project on GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial DStudio bootstrap"
   git remote add origin https://github.com/username/your-dstudio-project.git
   git push -u origin main
   ```

2. Ensure your repository has these key files:
   - `docs/prompts/separation-protocol.md`
   - `docs/prompts/initialization-protocol.md`
   - `docs/prompts/prompt-templates.md`

## Referencing Raw GitHub URLs

When creating prompts, use raw GitHub URLs to directly reference protocols:

```
Please read the DStudio protocols at:
- https://raw.githubusercontent.com/username/your-dstudio-project/main/docs/prompts/separation-protocol.md
- https://raw.githubusercontent.com/username/your-dstudio-project/main/docs/prompts/initialization-protocol.md

Then help me [specific task] following these protocols.
```

## Sample GitHub Prompt Templates

### 1. Initialize a New Project

```
Role: Technical Lead for DStudio project

Instructions:
1. Please read and follow the protocols at:
   - https://raw.githubusercontent.com/username/your-dstudio-project/main/docs/prompts/initialization-protocol.md
   - https://raw.githubusercontent.com/username/your-dstudio-project/main/docs/prompts/separation-protocol.md

2. Help me initialize a [type] project with the following key requirements:
   [List requirements]

3. Follow the initialization protocol to create all required documentation and initial structure.

4. Remember that all implementation code MUST go in the generated_implementation/ directory.

GitHub Repository: https://github.com/username/your-dstudio-project
```

### 2. Ongoing Development

```
Role: Developer for DStudio project

Context:
I'm working on the following GitHub repository which uses the DStudio architecture:
https://github.com/username/your-dstudio-project

Instructions:
1. Please read and follow the separation protocol at:
   - https://raw.githubusercontent.com/username/your-dstudio-project/main/docs/prompts/separation-protocol.md

2. Help me implement feature [feature name] defined in requirement REQ-XX.

3. Ensure all code is created only within the generated_implementation/ directory.

4. If you need to see any existing files, I can provide them or you can reference them from the repository.
```

## Setting Up a GitHub Actions Workflow for Validation

To ensure your project always follows the separation protocol, create a GitHub Actions workflow:

```yaml
# .github/workflows/validate-structure.yml
name: Validate DStudio Structure

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Check Meta/Implementation Separation
        run: |
          node scripts/gen-layout.js
          node scripts/gen-spec-index.js
          node scripts/gen-status-quick.js
          # Check if any implementation files exist outside the implementation directory
          if find . -path "./generated_implementation" -prune -o -type f -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" | grep -q .; then
            echo "ERROR: Implementation files found outside the generated_implementation directory!"
            find . -path "./generated_implementation" -prune -o -type f -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java"
            exit 1
          fi
```

## Updating Protocols

When you update protocols:

1. Commit changes to the GitHub repository
2. Update URLs in your prompts to reference the latest version:
   ```
   https://raw.githubusercontent.com/username/your-dstudio-project/main/docs/prompts/separation-protocol.md
   ```

3. For specific versions, reference a commit hash or tag:
   ```
   https://raw.githubusercontent.com/username/your-dstudio-project/v1.2.0/docs/prompts/separation-protocol.md
   ```

## Sharing Protocols Across Projects

To create a central protocol repository:

1. Create a dedicated DStudio-Protocols repository containing only the protocols
2. Reference these from multiple projects:
   ```
   https://raw.githubusercontent.com/username/dstudio-protocols/main/separation-protocol.md
   ```

3. Version the protocols using tags for stable references

## Best Practices

1. Always use raw GitHub URLs (`raw.githubusercontent.com`) not regular GitHub URLs
2. Include specific commit hashes for important production work to prevent drift
3. Check that the AI has properly accessed and followed the protocols
4. Keep all protocols up to date in your repository

Remember: The separation between meta-infrastructure and implementation code is MANDATORY and must be maintained at all times.