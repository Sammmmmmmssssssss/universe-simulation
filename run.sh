#!/bin/bash
echo "=== Universal Simulation ==="
echo "Installing dependencies..."
pip3 install -r requirements.txt --quiet 2>/dev/null || pip install -r requirements.txt --quiet 2>/dev/null
echo "Starting server at http://localhost:8000"
echo "Open your browser and navigate to http://localhost:8000"
cd "$(dirname "$0")" && python3 backend/main.py
