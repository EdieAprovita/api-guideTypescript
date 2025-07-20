#!/bin/bash

echo "=== MCP Playwright Diagnostic ==="
echo "Date: $(date)"
echo ""

echo "1. Node.js version:"
node --version
echo ""

echo "2. NPM version:"
npm --version
echo ""

echo "3. NPX location:"
which npx
echo ""

echo "4. NPX version:"
npx --version
echo ""

echo "5. Current PATH:"
echo "$PATH"
echo ""

echo "6. Testing npx @playwright/mcp@latest --version:"
npx @playwright/mcp@latest --version
echo ""

echo "7. Testing direct path to npx:"
/Users/edgarchavero/.nvm/versions/node/v22.16.0/bin/npx @playwright/mcp@latest --version
echo ""

echo "8. Testing wrapper script:"
/Volumes/EACM/Developer-Projects/api-guideTypescript/playwright-mcp-wrapper.sh --version
echo ""

echo "9. Current working directory:"
pwd
echo ""

echo "10. MCP config file location:"
ls -la /Users/edgarchavero/.cursor/mcp.json
echo ""

echo "11. MCP config content:"
cat /Users/edgarchavero/.cursor/mcp.json
echo ""

echo "=== Diagnostic Complete ==="
