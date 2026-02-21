#!/bin/bash
# Script to run the axayak project using the local node installation

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Add local node to PATH
export PATH="$SCRIPT_DIR/.local-node/bin:$PATH"

# Run the project
echo "Starting axayak..."
npm run dev
