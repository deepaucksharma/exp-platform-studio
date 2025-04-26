# Service Specifications

This directory contains the specifications for individual services. Each service should have its own specification file:

- `service-a-spec.md` - Specification for Service A
- `service-b-spec.md` - Specification for Service B
- etc.

## Adding a New Service Specification

1. Create a new markdown file named `<service-name>-spec.md`
2. Follow the template structure below
3. Add an include directive to `../spec.md`

## Template Structure

```markdown
# <Service Name> Specification

## Overview
Brief description of the service

## API
API specification

## Data Model
Data model specification

## Dependencies
Other services this service depends on

## Implementation Details
Language, frameworks, and other implementation details
```

## Including in Main Spec

To include your service spec in the main `spec.md`, add the following to the appropriate section:

```markdown
# include services/<service-name>-spec.md
```

This will be processed during the spec index generation.
