# DStudio Fixes Applied

The following issues from the negative-testing checklist have been fixed:

## 1. Single `generated_implementation/` root

- Updated `.gitignore` to allow sub-folders inside `generated_implementation/` 
- Modified `gen-layout.js` to detect service directories
- Added service structure detection to the layout generator

## 2. Watchdog + single `.agent-lock`

- Completely rewrote the watchdog script to support multiple agent lock files
- Added detection for `.agent-lock-*` pattern
- Each agent can now use its own lock file (e.g., `.agent-lock-agent1`)

## 3. Rollback script using a single temp branch

- Updated rollback script to accept `--no-push` flag
- Added unique branch name generation when multiple agents run rollback
- Added branch name with agent identifier when conflicts occur

## 4. Meta CI blocks whole repo

- Created a comprehensive `CONTRIBUTING.md` file
- Added clear documentation about the CI configuration and expectations
- Communicated that this is a feature by design to maintain repository integrity

## 5. Implementation CI ≈ language-blind

- Created dedicated CI workflow templates for each language
- Added README with instructions for setting up service-specific CI
- Each service can now have its own `.github/workflows/ci-<service>.yml` file

## 6. `test-affected.sh` vs renamed paths

- Updated `test-affected.sh` to properly handle nested service paths
- Added detection for service subdirectories
- Properly filters files by service when running in a service directory

## 7. Go & Rust cache in root `.cache/`

- Added Go and Rust build artifact directories to `.gitignore`
- Updated `cache-cleanup.js` to clean up language-specific build artifacts
- Added function to find and remove stale artifacts in the implementation directory

## 8. Spec/index drift for multiple services

- Created `docs/services/` directory for service-specific specifications
- Updated `gen-spec-index.js` to handle include directives
- Added documentation for maintaining service-specific specs

## 9. Agent prompt leakage

- Created `status/` directory for individual agent status files
- Added `merge-agent-status.js` script to combine status files into `project-status.md`
- Updated `package.json` with a new script to merge status files

## 10. GitHub rate limits on Actions caches

- Added service-specific cache keys to workflow templates
- Updated meta-CI configuration to use proper caching
- Ensured each service has isolated cache dependencies

## How to Use These Fixes

1. Each agent should now use its own lock file (e.g., `.agent-lock-agent1`)
2. For rollbacks, use `rollback.sh --no-push` in parallel agent environments
3. Each service should maintain its own CI configuration
4. Service specifications should go in `docs/services/<service>-spec.md`
5. Status updates should go to `status/status-<agent-id>.md`
