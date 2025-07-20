#!/bin/bash

# Wrapper script for Playwright MCP to ensure proper environment
export PATH="/Users/edgarchavero/.nvm/versions/node/v22.16.0/bin:$PATH"
export NODE_PATH="/Users/edgarchavero/.nvm/versions/node/v22.16.0/lib/node_modules"

# Execute the Playwright MCP command
exec npx @playwright/mcp@latest "$@"
