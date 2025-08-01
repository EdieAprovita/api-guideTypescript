#!/bin/bash

# MongoDB Memory Server Diagnostic Script
# This script checks if all dependencies are properly installed

set -e

echo "🔍 MongoDB Memory Server Diagnostic Tool"
echo "========================================"

# Detect OS
OS=$(uname -s)
echo "🖥️  Operating System: $OS"

if [[ "$OS" == "Linux" ]]; then
    echo ""
    echo "📋 Checking Linux system libraries..."
    
    # Check libcurl
    if ldconfig -p | grep -q libcurl; then
        echo "✅ libcurl: Available"
        ldconfig -p | grep libcurl | head -1
    else
        echo "❌ libcurl: Not found"
    fi
    
    # Check libssl
    if ldconfig -p | grep -q libssl; then
        echo "✅ libssl: Available"
        ldconfig -p | grep libssl | head -1
    else
        echo "❌ libssl: Not found"
    fi
    
    # Check libssl1.1 specifically
    if ldconfig -p | grep -q "libssl.so.1.1"; then
        echo "✅ libssl1.1: Available (Required for MongoDB Memory Server)"
        ldconfig -p | grep "libssl.so.1.1"
    else
        echo "❌ libssl1.1: Not found (Required for MongoDB Memory Server)"
    fi
    
    # Check libcrypto1.1
    if ldconfig -p | grep -q "libcrypto.so.1.1"; then
        echo "✅ libcrypto1.1: Available"
        ldconfig -p | grep "libcrypto.so.1.1"
    else
        echo "❌ libcrypto1.1: Not found"
    fi
else
    echo "📋 Skipping library check on $OS"
fi

echo ""
echo "🔧 Environment Variables:"
echo "  MONGODB_MEMORY_SERVER_VERSION: ${MONGODB_MEMORY_SERVER_VERSION:-'Not set'}"
echo "  MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT: ${MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT:-'Not set'}"
echo "  MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY: ${MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY:-'Not set'}"
echo "  MONGODB_MEMORY_SERVER_DOWNLOAD_DIR: ${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-'Not set'}"
echo "  CI: ${CI:-'Not set'}"
echo "  NODE_ENV: ${NODE_ENV:-'Not set'}"

echo ""
echo "📦 Node.js Information:"
echo "  Node Version: $(node --version)"
echo "  NPM Version: $(npm --version)"

echo ""
echo "🔍 Checking mongodb-memory-server availability..."
if node -e "require('mongodb-memory-server')" 2>/dev/null; then
    echo "✅ mongodb-memory-server: Available"
    
    # Get version
    VERSION=$(node -e "console.log(require('mongodb-memory-server/package.json').version)" 2>/dev/null || echo "Unknown")
    echo "  Version: $VERSION"
else
    echo "❌ mongodb-memory-server: Not available"
    echo "💡 Run 'npm install' to install dependencies"
fi

echo ""
echo "📁 Cache Directory:"
CACHE_DIR="${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-$HOME/.cache/mongodb-binaries}"
if [[ -d "$CACHE_DIR" ]]; then
    echo "✅ Cache directory exists: $CACHE_DIR"
    echo "  Contents:"
    ls -la "$CACHE_DIR" 2>/dev/null || echo "  (Empty or inaccessible)"
else
    echo "⚠️  Cache directory does not exist: $CACHE_DIR"
fi

echo ""
echo "🎯 Recommendations:"

if [[ "$OS" == "Linux" ]]; then
    if ! ldconfig -p | grep -q "libssl.so.1.1"; then
        echo "❗ Install libssl1.1 for MongoDB Memory Server:"
        echo "   sudo apt-get install -y libssl1.1"
        echo "   OR download manually:"
        echo "   wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl1.1/libssl1.1_1.1.1f-1ubuntu2.22_amd64.deb"
        echo "   sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2.22_amd64.deb"
    fi
fi

if ! node -e "require('mongodb-memory-server')" 2>/dev/null; then
    echo "❗ Install mongodb-memory-server:"
    echo "   npm install"
fi

echo ""
echo "✅ Diagnostic completed!"