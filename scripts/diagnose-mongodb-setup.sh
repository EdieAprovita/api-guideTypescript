#!/bin/bash

# MongoDB Setup Diagnostics
# This script helps diagnose MongoDB setup issues in CI/CD environments

set -e

echo "🔍 MongoDB Setup Diagnostics"
echo "==============================="

# Check system information
echo "📋 System Information:"
echo "   - OS: $(uname -s) $(uname -r)"
echo "   - Architecture: $(uname -m)"
if command -v free >/dev/null 2>&1; then
    available_ram=$(free -h | grep '^Mem:' | awk '{print $2}')
    used_ram=$(free -h | grep '^Mem:' | awk '{print $3}')
    echo "   - Available RAM: $available_ram (Used: $used_ram)"
else
    echo "   - Available RAM: Unknown (free command not available)"
fi

if command -v df >/dev/null 2>&1; then
    tmp_space=$(df -h /tmp | tail -1 | awk '{print $4}')
    root_space=$(df -h / | tail -1 | awk '{print $4}')
    echo "   - Available Disk (/tmp): $tmp_space"
    echo "   - Available Disk (/): $root_space"
else
    echo "   - Available Disk: Unknown (df command not available)"
fi

# Check Node.js and npm
echo ""
echo "🟢 Node.js Environment:"
echo "   - Node version: $(node --version)"
echo "   - npm version: $(npm --version)"
echo "   - Node options: ${NODE_OPTIONS:-'Not set'}"
echo "   - Platform: $(node -p 'process.platform')"
echo "   - Arch: $(node -p 'process.arch')"

# Check environment variables
echo ""
echo "🔧 MongoDB Environment Variables:"
echo "   - MONGODB_MEMORY_SERVER_VERSION: ${MONGODB_MEMORY_SERVER_VERSION:-'Not set'}"
echo "   - MONGODB_MEMORY_SERVER_DOWNLOAD_DIR: ${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-'Not set'}"
echo "   - MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT: ${MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT:-'Not set'}"
echo "   - MONGODB_MEMORY_SERVER_LAUNCH_TIMEOUT: ${MONGODB_MEMORY_SERVER_LAUNCH_TIMEOUT:-'Not set'}"
echo "   - CI: ${CI:-'Not set'}"
echo "   - NODE_ENV: ${NODE_ENV:-'Not set'}"

# Check directories
echo ""
echo "📁 Directory Status:"
DOWNLOAD_DIR="${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-~/.cache/mongodb-binaries}"
echo "   - Download directory: $DOWNLOAD_DIR"
if [ -d "$DOWNLOAD_DIR" ]; then
    echo "   - Directory exists: ✅"
    item_count=$(ls -la "$DOWNLOAD_DIR" 2>/dev/null | wc -l)
    echo "   - Contents: $item_count items"
    if command -v du >/dev/null 2>&1; then
        dir_size=$(du -sh "$DOWNLOAD_DIR" 2>/dev/null | cut -f1 || echo 'Unknown')
        echo "   - Directory size: $dir_size"
    fi
    # List actual contents
    if [ "$item_count" -gt 2 ]; then
        echo "   - Files found:"
        ls -la "$DOWNLOAD_DIR" 2>/dev/null | tail -n +4 | head -5 | while read line; do
            echo "     $line"
        done
        if [ "$item_count" -gt 7 ]; then
            echo "     ... and $((item_count - 7)) more items"
        fi
    fi
else
    echo "   - Directory exists: ❌"
    echo "   - Creating directory..."
    if mkdir -p "$DOWNLOAD_DIR"; then
        echo "   - Directory created: ✅"
    else
        echo "   - Failed to create directory: ❌"
    fi
fi

# Test network connectivity
echo ""
echo "🌐 Network Connectivity:"
echo "   - Testing GitHub connectivity..."
if timeout 10 curl -s https://github.com > /dev/null 2>&1; then
    echo "   - GitHub: ✅ Reachable"
else
    echo "   - GitHub: ❌ Not reachable or timeout"
fi

echo "   - Testing npm registry..."
if timeout 10 curl -s https://registry.npmjs.org > /dev/null 2>&1; then
    echo "   - npm registry: ✅ Reachable"
else
    echo "   - npm registry: ❌ Not reachable or timeout"
fi

echo "   - Testing MongoDB downloads..."
if timeout 10 curl -s --head https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2004-5.0.19.tgz > /dev/null 2>&1; then
    echo "   - MongoDB downloads: ✅ Reachable"
else
    echo "   - MongoDB downloads: ❌ Not reachable or timeout"
fi

# Check if MongoDB binaries are already available
echo ""
echo "💾 MongoDB Binary Status:"
if command -v mongod > /dev/null 2>&1; then
    echo "   - System mongod: ✅ Available ($(which mongod))"
    mongod_version=$(mongod --version 2>/dev/null | head -1 || echo "Version check failed")
    echo "   - Version: $mongod_version"
else
    echo "   - System mongod: ❌ Not available"
fi

# Check mongodb-memory-server package
echo ""
echo "📦 MongoDB Memory Server Package:"
if npm list mongodb-memory-server > /dev/null 2>&1; then
    VERSION=$(npm list mongodb-memory-server --depth=0 2>/dev/null | grep mongodb-memory-server | sed 's/.*@//' | sed 's/ .*//' || echo "Unknown")
    echo "   - Package installed: ✅ (v$VERSION)"
else
    echo "   - Package installed: ❌"
    echo "   - Attempting to check global installation..."
    if npm list -g mongodb-memory-server > /dev/null 2>&1; then
        GLOBAL_VERSION=$(npm list -g mongodb-memory-server --depth=0 2>/dev/null | grep mongodb-memory-server | sed 's/.*@//' | sed 's/ .*//' || echo "Unknown")
        echo "   - Global package: ✅ (v$GLOBAL_VERSION)"
    else
        echo "   - Global package: ❌"
    fi
fi

# Test basic functionality
echo ""
echo "🧪 Basic Functionality Test:"
echo "   - Testing MongoDB Memory Server import..."

node -e "
try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('   - Import: ✅ Success');
    console.log('   - Constructor available:', typeof MongoMemoryServer === 'function' ? '✅' : '❌');
    
    // Test basic configuration
    console.log('   - Testing basic configuration...');
    const instance = new MongoMemoryServer({
        instance: { dbName: 'test-diagnostic' },
        binary: { version: '5.0.19' },
        autoStart: false
    });
    console.log('   - Configuration: ✅ Success');
} catch (error) {
    console.log('   - Import: ❌ Failed -', error.message);
    console.log('   - Stack trace preview:', error.stack.split('\\n')[0]);
}
" 2>/dev/null || echo "   - Node test: ❌ Failed to execute"

# Check process limits
echo ""
echo "⚙️  Process Limits:"
if command -v ulimit >/dev/null 2>&1; then
    echo "   - Max open files: $(ulimit -n)"
    echo "   - Max processes: $(ulimit -u)"
    echo "   - Max memory: $(ulimit -v 2>/dev/null || echo 'unlimited')"
else
    echo "   - Process limits: Unknown (ulimit not available)"
fi

# Check for common issues
echo ""
echo "🔧 Common Issues Check:"
if [ "$CI" = "true" ]; then
    echo "   - Running in CI: ✅"
    if [ -z "$MONGODB_MEMORY_SERVER_DOWNLOAD_DIR" ]; then
        echo "   - ⚠️  MONGODB_MEMORY_SERVER_DOWNLOAD_DIR not set - using default"
    fi
    if [ -z "$MONGODB_MEMORY_SERVER_VERSION" ]; then
        echo "   - ⚠️  MONGODB_MEMORY_SERVER_VERSION not set - using default"
    fi
else
    echo "   - Running locally: ✅"
fi

echo ""
echo "💡 Recommendations:"
if [ "$CI" = "true" ]; then
    echo "   - Use stable MongoDB version (5.0.19 or 4.4.18)"
    echo "   - Set explicit download directory in /tmp"
    echo "   - Increase timeouts for CI environment"
    echo "   - Consider pre-downloading binaries in CI setup"
else
    echo "   - Use latest MongoDB version for local development"
    echo "   - Clear download cache if issues persist"
fi

echo ""
echo "🏁 Diagnostic Complete"
echo ""
echo "📋 Summary for CI debugging:"
echo "   - MongoDB Memory Server package: $(npm list mongodb-memory-server > /dev/null 2>&1 && echo 'Installed' || echo 'Missing')"
echo "   - Download directory: $([ -d "${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-~/.cache/mongodb-binaries}" ] && echo 'Exists' || echo 'Missing')"
echo "   - Network access: $(timeout 5 curl -s https://github.com > /dev/null 2>&1 && echo 'Available' || echo 'Limited')"
echo "   - System resources: $(free -h 2>/dev/null | grep '^Mem:' | awk '{print $2}' || echo 'Unknown') RAM, $(df -h /tmp 2>/dev/null | tail -1 | awk '{print $4}' || echo 'Unknown') /tmp space"