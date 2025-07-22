#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create virtual environment
python3 -m venv "$SCRIPT_DIR/venv"

# Activate virtual environment
source "$SCRIPT_DIR/venv/bin/activate"

# Install required packages
pip install opencv-python numpy

# Make the video_analyzer.py script executable
chmod +x "$SCRIPT_DIR/video_analyzer.py"

# Create a symlink to the script in the venv/bin directory
ln -sf "$SCRIPT_DIR/video_analyzer.py" "$SCRIPT_DIR/venv/bin/video-analyzer"

echo "Setup complete. The video-analyzer script is now available at $SCRIPT_DIR/venv/bin/video-analyzer"