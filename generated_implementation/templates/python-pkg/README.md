# Python Template (requirements.txt)

This template provides a basic Flask-based web application setup for Python projects using `requirements.txt` for dependency management.

## Structure

```
python-pkg/
├── requirements.txt     # Package dependencies
├── src/                 # Source code directory
│   └── app.py           # Main application file
└── tests/               # Test directory
    └── test_app.py      # Tests for the main application
```

## Dependencies

- **flask**: Lightweight web framework
- **gunicorn**: WSGI HTTP server for production
- **python-dotenv**: Environment variable management
- **pytest**: Testing framework
- **black**: Code formatter
- **pylint**: Static code analyzer

## Getting Started

### 1. Copy the template to your implementation directory

```bash
cp -r templates/python-pkg/* ./
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the application

```bash
python src/app.py
```

The application will run at http://localhost:8080

### 5. Run tests

```bash
pytest
```

## Customizing

- Add routes in `src/app.py` or create a separate routes module
- Create additional modules in the `src` directory
- Configure pytest in `pytest.ini`
- Add environment variables in a `.env` file (don't commit this file)
