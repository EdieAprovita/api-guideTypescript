#!/bin/bash

# Setup MongoDB Memory Server Environment Variables Only
# This script only sets up environment variables without testing

set -e

echo "🔧 Setting up MongoDB Memory Server environment variables..."

# Create cache directory if it doesn't exist
mkdir -p ~/.cache/mongodb-binaries

# Set environment variables for mongodb-memory-server
export MONGODB_MEMORY_SERVER_VERSION=${MONGODB_MEMORY_SERVER_VERSION:-'6.0.0'}
export MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT=${MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT:-'60000'}
export MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY=${MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY:-'3'}
export MONGODB_MEMORY_SERVER_DOWNLOAD_DIR=${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-'~/.cache/mongodb-binaries'}

# Detect operating system
OS=$(uname -s)
echo "🖥️  Detected OS: $OS"

# Verify system dependencies (Linux only)
if [[ "$OS" == "Linux" ]]; then
    echo "📋 Checking system dependencies on Linux..."
    
    # Check for required libraries
    if ! ldconfig -p | grep -q libcurl; then
        echo "⚠️  libcurl not found, installing..."
        sudo apt-get update && sudo apt-get install -y libcurl4
    fi

    if ! ldconfig -p | grep -q libssl; then
        echo "⚠️  libssl not found, installing..."
        sudo apt-get update && sudo apt-get install -y libssl-dev
    fi
else
    echo "📋 Skipping system dependency check on $OS"
fi

echo "✅ MongoDB Memory Server environment setup completed"
echo "📋 Configuration:"
echo "   - Version: $MONGODB_MEMORY_SERVER_VERSION"
echo "   - Download Timeout: $MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT"
echo "   - Download Retry: $MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY"
echo "   - Download Dir: $MONGODB_MEMORY_SERVER_DOWNLOAD_DIR"
echo "💡 MongoDB Memory Server will be tested when tests run"