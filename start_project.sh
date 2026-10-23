#!/bin/bash
# Run with the supported system Node.js version.

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd "$SCRIPT_DIR" || exit 1
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) === 24 ? 0 : 1)'; then
  echo "Install Node.js 24 before starting this project." >&2
  exit 1
fi

# Run the project
echo "Starting axayak..."
npm run dev
