# Go Template

This template provides a basic Gin-based web service setup for Go projects.

## Structure

```
go-pkg/
├── go.mod              # Module dependencies
├── main.go             # Main application entry point
└── main_test.go        # Tests for the main application
```

## Dependencies

- **gin-gonic/gin**: HTTP web framework
- **stretchr/testify**: Testing toolkit

## Getting Started

### 1. Copy the template to your implementation directory

```bash
cp -r templates/go-pkg/* ./
```

### 2. Initialize the module

```bash
# Update the module name in go.mod to match your project
go mod edit -module github.com/yourname/yourproject
go mod tidy
```

### 3. Run the application

```bash
go run main.go
```

The server will run at http://localhost:8080

### 4. Run tests

```bash
go test ./...
```

## Customizing

- Add routes in `main.go` or create separate route files
- Create additional packages in separate directories
- Add middleware in the Gin router setup
- Configure logging in `main.go`
