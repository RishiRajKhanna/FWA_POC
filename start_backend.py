#!/usr/bin/env python3
"""
Simple script to start the backend API server
"""

import os
import sys

# Add the Backend directory to the Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend')
sys.path.insert(0, backend_dir)

# Change to the Backend directory
os.chdir(backend_dir)

# Import and run the API
from api import app

if __name__ == '__main__':
    print("Starting Fraud Detection API server...")
    print("API will be available at: http://localhost:5001")
    print("Health check: http://localhost:5001/api/health")
    print("Press Ctrl+C to stop the server")
    
    app.run(debug=True, host='0.0.0.0', port=5001)