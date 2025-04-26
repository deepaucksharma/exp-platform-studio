# Service CI Workflows

This directory contains CI workflow templates for different languages. Each service should have its own dedicated CI workflow file to ensure proper isolation and parallel execution.

## Usage Instructions

1. Choose the appropriate template for your service's language
2. Copy the template to a new file named `ci-<service-name>.yml`
3. Replace `<SERVICE_PATH>` with your service's path within the `generated_implementation` directory

For example, if you have a JavaScript service in `generated_implementation/user-service`:

1. Copy `ci-template-js.yml` to `ci-user-service.yml`
2. Replace all occurrences of `<SERVICE_PATH>` with `user-service`

## Available Templates

- `ci-template-js.yml` - For JavaScript/Node.js services
- `ci-template-python.yml` - For Python services
- `ci-template-go.yml` - For Go services
- `ci-template-rust.yml` - For Rust services
- `ci-template-java.yml` - For Java services (Maven or Gradle)

## Adding Custom Steps

You can customize these workflows for your service's specific needs. Common additions include:

- Custom build steps
- Deployment actions
- Integration tests
- Container builds

## Important Notes

- Each workflow runs only when files in its specific service path are changed
- Cache keys are namespaced by service to prevent conflicts
- Working directory is set per job to ensure proper isolation
