# How to run Axayak locally

This project uses a local version of Node.js (v20.11.0) installed in the `.local-node` directory to avoid conflicts with system configurations.

## Prerequisites

- None! Node.js is included locally.

## Running the project

Simply run the helper script:

```bash
./start_project.sh
```

This script will:
1. Add the local Node.js to your PATH.
2. Start the development server.

## Troubleshooting

If you see "command not found" errors, ensure you are running the command from the project root:

```bash
cd /Users/axayakl/Desktop/PARA/Protectos/axayak
./start_project.sh
```
