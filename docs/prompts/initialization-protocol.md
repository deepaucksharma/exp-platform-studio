# DStudio Project Initialization Protocol

## Phase 1: Project Specification

### Role and Objective
You will act as the technical lead for initializing a new project using the DStudio architecture. Your goal is to create a complete, detailed specification and project plan while maintaining the meta/implementation separation.

### Initial Project Definition
Start by creating a thorough project specification document at `docs/spec.md`:

1. **Project Overview**
   - Define a clear project purpose and vision
   - Outline key stakeholders and users
   - Establish success criteria

2. **Feature Requirements**
   - Core features (tagged as `[IMPL]`)
   - Technical requirements
   - Non-functional requirements (performance, security, etc.)
   - Constraints and limitations

3. **System Architecture**
   - High-level components and their interactions
   - Data models and flows
   - Integration points and external dependencies

4. **User Experience**
   - User personas
   - Critical user journeys
   - Interface requirements

### Technology Selection
Create a technology recommendation document at `docs/tech-stack.md`:

1. **Evaluate options for the implementation**:
   - Compare at least 3 potential technology stacks
   - Analyze pros/cons for each option
   - Make a clear recommendation with justification

2. **Define technical boundaries**:
   - Maximum dependency count/size
   - Performance expectations
   - Compatibility requirements

### Deliverable Creation
Update these key files as part of initialization:

1. **Enhanced spec.md**: Complete with all tagged `[IMPL]` requirements
2. **Implementation README**: Create at `generated_implementation/README.md`
3. **Project Timeline**: Create as `docs/timeline.md`
4. **Risk Assessment**: Create as `docs/risk-assessment.md`

## Phase 2: Project Planning

### Task Breakdown
Update `project-status.md` with:

1. **Milestone Definition**:
   - Create 3-5 clear milestones with definitions of done
   - Tag implementation-specific milestones with `[IMPL]`

2. **Task Sequencing**:
   - Break requirements into sequential tasks
   - Identify dependencies between tasks
   - Estimate complexity (Simple, Medium, Complex)

3. **Prioritization Framework**:
   - MoSCoW categorization (Must, Should, Could, Won't)
   - Critical path identification

### Development Approach
Define the development methodology in `docs/methodology.md`:

1. **Iteration Structure**:
   - Sprint/cycle length
   - Definition of Done for increments
   - Testing and validation approach

2. **Feedback Cycles**:
   - Review points
   - Stakeholder check-ins
   - Continuous integration approach

### Environment Setup
Initial setup guidance in `docs/setup.md`:

1. **Development Environment**:
   - Required tools and versions
   - Configuration instructions
   - Local testing approach

2. **CI/CD Planning**:
   - Pipeline stages
   - Quality gates
   - Deployment strategy

## Phase 3: Implementation Initialization

### Scaffolding Setup
Create the initial implementation structure:

1. **Directory Structure**:
   - Set up `generated_implementation/` with appropriate folders for chosen technology
   - Create READMEs for each major directory
   - Establish configuration templates

2. **Bootstrapping**:
   - Initialize minimum viable project structure
   - Set up basic build process
   - Create "Hello World" verification

### Verification Procedures
Create verification scripts and procedures:

1. **Validation Tests**:
   - Create basic sanity checks for the environment
   - Implement verification of structural integrity
   - Document validation approach

2. **Quality Standards**:
   - Define code style guidelines
   - Set up linting configurations
   - Establish documentation standards

## Phase 4: Launch Readiness

### Initial Backlog
Generate the first implementation backlog:

1. **First Iteration Tasks**:
   - Select 3-5 initial tasks for first development cycle
   - Provide detailed acceptance criteria for each
   - Create test plans for verification

2. **First Week Plan**:
   - Day-by-day breakdown of initial development
   - Key milestones for first week
   - Success criteria for initialization completion

### Documentation Finalization
Ensure all documentation is complete:

1. **Review all documentation** for completeness and consistency
2. **Cross-reference** all documents to ensure alignment
3. **Tag all implementation items** with `[IMPL]` markers

## Execution Instructions

1. Work through each phase sequentially
2. Generate all required documents
3. Maintain strict separation between meta and implementation layers
4. Use the generator scripts after each phase:
   ```bash
   node scripts/gen-spec-index.js
   node scripts/gen-layout.js
   node scripts/gen-status-quick.js
   ```
5. Provide a comprehensive initialization report upon completion

## IMPORTANT: Meta/Implementation Boundary Enforcement

Always maintain strict separation between:
- Meta layer (project management, infrastructure) in the root directory
- Implementation layer (actual code) in the `generated_implementation/` directory

All implementation-specific requirements must be tagged with `[IMPL]` in specification documents.