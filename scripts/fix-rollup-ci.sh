#!/bin/bash

# Script to fix Rollup-related issues in CI environment
# This script ensures that the correct Rollup binary for the target environment is installed.

set -e

echo "🔧 Fixing Rollup CI issues..."

# Clean install of dependencies
echo "📦 Installing dependencies with npm ci..."
npm ci

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

echo "🖥️ Platform detected: $OS ($ARCH)"

# If running on Linux (common for GitHub Actions default runners)
if [ "$OS" = "linux" ]; then
    echo "🐧 Linux environment detected. Ensuring Rollup native bindings are present..."
    
    # Force installation of the Linux x64 binary if it's missing
    # This specifically fixes the "Module '@rollup/rollup-linux-x64-gnu' not found" error
    if [ ! -d "node_modules/@rollup/rollup-linux-x64-gnu" ]; then
        echo "📥 Installing @rollup/rollup-linux-x64-gnu explicitly..."
        npm install --no-save @rollup/rollup-linux-x64-gnu
    else
        echo "✅ Rollup native bindings already present."
    fi
fi

echo "✅ Rollup CI fix completed successfully."
exit 0
