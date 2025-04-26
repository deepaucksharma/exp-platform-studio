"""
Main application module for the Python implementation
"""

from flask import Flask

app = Flask(__name__)


@app.route('/')
def hello():
    """Return a friendly HTTP greeting."""
    return 'Hello from DStudio Python Implementation!'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
