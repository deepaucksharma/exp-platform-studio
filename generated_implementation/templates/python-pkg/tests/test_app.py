"""
Tests for the main application
"""

import pytest
from src.app import app


@pytest.fixture
def client():
    """Create a test client for the app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_hello(client):
    """Test the hello endpoint."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Hello from DStudio Python Implementation!' in response.data
