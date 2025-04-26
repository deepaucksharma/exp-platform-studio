# DStudio

A stack-agnostic AI-assisted development environment with comprehensive workflows and monitoring tools.

## Architecture Overview

DStudio is organized as a two-layer system:

1. **Meta Layer (Root Directory)**: Contains configuration, monitoring scripts, and documentation that power the AI-agent ecosystem.
2. **Implementation Layer (`generated_implementation/` Directory)**: Contains the actual code generated and managed by the AI agent.

This separation ensures clear boundaries between the meta-infrastructure that facilitates AI-driven development and the actual implementation code being created.

## Getting Started

```bash
git clone <repo>
cd <repo>
chmod +x scripts/*.sh scripts/*.js
```

## Setup

1. Edit **docs/spec.md** to define your project requirements
   - Mark implementation-specific sections with [IMPL] tag
2. Run the generator scripts:

```bash
node scripts/gen-layout.js      # Analyzes implementation directory structure
node scripts/gen-spec-index.js  # Parses spec.md for requirements
node scripts/gen-file-map.js    # Maps implementation files for integrity checking
node scripts/gen-status-quick.js # Generates current status summary
```

3. Start the monitoring process:

```bash
./scripts/watchdog.sh &
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

## Key Features

- **Stack Agnostic**: Compatible with JavaScript, Python, Go, Rust, and Java
- **Monitoring**: File integrity checking and agent heartbeat monitoring
- **Testing**: Smart test runner for affected components only
- **Recovery**: Automated error detection and recovery
- **CI/CD**: Standardized continuous integration and deployment
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
│   ├── gen-layout.js         # Generates implementation layout
│   ├── gen-spec-index.js     # Parses specification
│   └── ...                   # Other utility scripts
└── generated_implementation/ # Actual implementation code
    └── ...                   # Generated code organized by language
```

## Working with Implementation Code

All actual application code is generated inside the `generated_implementation/` directory. When running commands or scripts, they will automatically target this directory for operations like:

- Building code
- Running tests
- Checking file integrity
- Analyzing affected components

This separation allows the meta-infrastructure to remain stable while implementation code evolves.

## Documentation

See the `/docs` directory for detailed documentation:

- `spec.md`: Project requirements and specifications (with [IMPL] tags)
- `protocol/`: Development standards and protocols
- `prompts/`: Standardized AI prompt protocols
- `metrics.md`: Project progress metrics

## License

MIT

---