#!/bin/bash

# Fix Rollup native module issues in CI environment
# This script addresses the @rollup/rollup-linux-x64-gnu module not found error

set -e

echo "🔧 Fixing Rollup native modules for CI environment..."

# Clean npm cache
echo "📦 Cleaning npm cache..."
npm cache clean --force

# Remove node_modules and package-lock.json
echo "🗑️  Removing existing node_modules..."
rm -rf node_modules

# Fresh install without optional dependencies first
echo "📥 Installing dependencies (without optional)..."
npm ci --no-optional

# Install platform-specific Rollup binary
echo "🏗️  Installing Rollup native binary for Linux x64..."
npm install @rollup/rollup-linux-x64-gnu --no-save --ignore-scripts || {
    echo "⚠️  Direct install failed, trying alternative approach..."
    
    # Alternative: install all Rollup native binaries
    npm install \
        @rollup/rollup-linux-x64-gnu \
        @rollup/rollup-linux-x64-musl \
        --no-save --ignore-scripts || {
        
        echo "⚠️  Alternative approach failed, trying manual resolution..."
        
        # Last resort: reinstall vitest and rollup
        npm install vitest@latest --no-save
        npm install rollup@latest --no-save
    }
}

# Verify installation
echo "✅ Verifying Rollup installation..."
if node -e "require('@rollup/rollup-linux-x64-gnu')" 2>/dev/null; then
    echo "✅ Rollup Linux x64 binary installed successfully"
else
    echo "⚠️  Rollup binary verification failed, but continuing..."
fi

# List installed Rollup binaries for debugging
echo "📋 Installed Rollup binaries:"
ls -la node_modules/@rollup/ 2>/dev/null || echo "No @rollup directory found"

echo "🎉 Rollup CI fix completed"
