# DStudio

A stack-agnostic AI-assisted development environment with comprehensive workflows and monitoring tools.

## Architecture Overview

DStudio is organized as a two-layer system:

1. **Meta Layer (Root Directory)**: Contains configuration, monitoring scripts, and documentation that power the AI-agent ecosystem.
2. **Implementation Layer (`generated_implementation/` Directory)**: Contains the actual code generated and managed by the AI agent.

This separation ensures clear boundaries between the meta-infrastructure that facilitates AI-driven development and the actual implementation code being created.

## Meta and Implementation Separation

The project strictly separates concerns into two layers:

### Meta Layer (Root directory)
- Configuration files (`.agent-config.json`)
- Project status tracking (`project-status.md`, `status.quick.json`)
- Specification and indexing (`spec.index.json`)
- Documentation (`docs/`)
- Utility scripts (`scripts/`)
- Meta-level CI/CD (`.github/workflows/meta-ci.yml`)

### Implementation Layer (`generated_implementation/` directory)
- All application code
- Language-specific configuration files
- Implementation tests
- Implementation-specific documentation
- Implementation-specific CI/CD workflows

This separation ensures:
- The meta layer can be updated independently of the implementation
- Implementation can be rolled back without affecting meta infrastructure
- Clear boundaries for AI agents to operate within

## Getting Started

```bash
git clone <repo>
cd <repo>
npm install  # Installs meta layer dependencies
```

## Setup

1. Edit **docs/spec.md** to define your project requirements
   - Mark implementation-specific sections with [IMPL] tag
2. Run the generator scripts:

```bash
npm run generate:all  # Runs all generator scripts
# Or run individual scripts:
npm run generate:layout      # Analyzes implementation directory structure
npm run generate:spec-index  # Parses spec.md for requirements
npm run generate:filemap     # Maps implementation files for integrity checking
npm run generate:status      # Generates current status summary
```

3. Start the monitoring process:

```bash
npm run watchdog
```

4. Run a health check to ensure proper setup:

```bash
npm run health-check
```

## Using AI Assistance

DStudio includes standardized prompt protocols for working with AI assistants like Claude:

1. **Prompts Directory**: Browse `docs/prompts/` for standardized protocols
2. **Templates**: Use the templates in `docs/prompts/prompt-templates.md`
3. **Structure Enforcement**: Always reference `docs/prompts/separation-protocol.md` in your prompts

Example prompt to start a new project:
```
Please read the DStudio protocols at:
- docs/prompts/initialization-protocol.md
- docs/prompts/separation-protocol.md

Then help me initialize a new web application following these protocols.
```

## Working with Implementation Code

All actual application code is generated inside the `generated_implementation/` directory. 

When adding new code:
1. Always work within the implementation directory
2. Use implementation-specific CI/CD for testing and deployment
3. Keep language-specific configuration files within the implementation directory

## Key Features

- **Stack Agnostic**: Compatible with JavaScript, Python, Go, Rust, and Java
- **Monitoring**: File integrity checking and agent heartbeat monitoring
- **Testing**: Smart test runner for affected components only
- **Recovery**: Automated error detection and recovery
- **CI/CD**: Separate CI/CD for meta and implementation layers
- **Documentation**: Structured protocols for collaborative development

## Project Structure

```
DStudio/
├── .agent-config.json        # Configuration for the AI agent
├── project-status.md         # Current project status
├── docs/                     # Documentation
│   ├── spec.md               # Project requirements with [IMPL] tags
│   ├── metrics.md            # Project progress metrics
│   ├── protocol/             # Development standards
│   └── prompts/              # AI prompt protocols
├── scripts/                  # Utility scripts 
│   ├── config-utils.js       # Path and configuration utilities
│   ├── gen-layout.js         # Generates implementation layout
│   ├── gen-spec-index.js     # Parses specification
│   └── ...                   # Other utility scripts
├── .github/                  # CI/CD for meta layer
│   └── workflows/            
│       └── meta-ci.yml       # Meta-level CI workflow
└── generated_implementation/ # Actual implementation code
    ├── .github/              # Implementation-specific CI/CD
    │   └── workflows/        
    │       └── implementation-ci.yml
    └── ...                   # Generated code organized by language
```

## Documentation

See the `/docs` directory for detailed documentation:

- `spec.md`: Project requirements and specifications (with [IMPL] tags)
- `protocol/`: Development standards and protocols
- `prompts/`: Standardized AI prompt protocols
- `metrics.md`: Project progress metrics

## Troubleshooting

If you encounter issues with the meta/implementation separation:

1. Run `npm run health-check` to identify problems
2. Check the configurations in `.agent-config.json`
3. Make sure language-specific files are in the implementation directory
4. Verify that paths in scripts use the config utility functions

## License

MIT

---