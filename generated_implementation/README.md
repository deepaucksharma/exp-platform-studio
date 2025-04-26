# DStudio Implementation

This directory contains the actual implementation of the DStudio project. All application code, tests, and implementation-specific configurations should be placed here.

## Structure

The implementation directory is designed to be self-contained. It should include:

- Application source code
- Tests
- Implementation-specific documentation
- Implementation-specific CI/CD configuration
- Build artifacts (these will be automatically ignored by the meta scripts)

## Language Templates

DStudio provides templates for several programming languages to help you get started quickly:

### JavaScript/Node.js

```bash
# Copy the template
cp -r templates/js/* ./

# Install dependencies
npm install

# Start the development server
npm run dev
```

[Learn more about the JavaScript template](templates/js/README.md)

### Python (with requirements.txt)

```bash
# Copy the template
cp -r templates/python-pkg/* ./

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python src/app.py
```

[Learn more about the Python template](templates/python-pkg/README.md)

### Go

```bash
# Copy the template
cp -r templates/go-pkg/* ./

# Update the module name
go mod edit -module github.com/yourname/yourproject
go mod tidy

# Run the application
go run main.go
```

[Learn more about the Go template](templates/go-pkg/README.md)

## CI/CD

The implementation has its own CI/CD pipeline in the `.github/workflows` directory. This allows the implementation to have technology-specific CI/CD processes while the meta layer focuses on project structure validation.

## Testing

Tests should be placed within this directory structure and follow the conventions of your chosen technology stack. The `test-affected.sh` script in the meta layer will automatically detect your tests based on the patterns defined in `.agent-config.json`.

## Notes

- The meta layer scripts will scan this directory for generating project layouts and file maps
- Changing the implementation should not require modifying the meta layer
- Implementation-specific dependencies should be declared in implementation-specific files (e.g., package.json, requirements.txt, etc.)
