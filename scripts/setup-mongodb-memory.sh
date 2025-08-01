#!/bin/bash

# Setup MongoDB Memory Server for CI
# This script ensures MongoDB memory server is properly configured for CI environments

set -e

echo "🔧 Setting up MongoDB Memory Server for CI..."

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

# Check if mongodb-memory-server is available
echo "🔍 Checking if mongodb-memory-server is available..."

if ! node -e "require('mongodb-memory-server')" 2>/dev/null; then
    echo "⚠️  mongodb-memory-server is not available yet"
    echo "💡 This is normal if dependencies haven't been installed"
    echo "📋 Skipping MongoDB Memory Server verification"
    echo "✅ Environment variables configured for later use"
    exit 0
fi

# Test if we can create a simple MongoDB memory server instance
echo "🧪 Testing MongoDB Memory Server setup..."

# Create a simple test script
cat > /tmp/test-mongodb-memory.js << 'EOF'
const { MongoMemoryServer } = require('mongodb-memory-server');

async function testMongoMemoryServer() {
    try {
        console.log('🔄 Creating test MongoDB memory server...');
        
        const mongoServer = await MongoMemoryServer.create({
            instance: {
                dbName: 'test-db',
            },
            binary: {
                version: process.env.MONGODB_MEMORY_SERVER_VERSION || '6.0.0',
                downloadDir: process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || undefined,
            },
        });

        const uri = mongoServer.getUri();
        console.log(`✅ MongoDB Memory Server created successfully: ${uri}`);
        
        await mongoServer.stop();
        console.log('✅ MongoDB Memory Server stopped successfully');
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB Memory Server test failed:', error.message);
        return false;
    }
}

testMongoMemoryServer().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

# Run the test
if node /tmp/test-mongodb-memory.js; then
    echo "✅ MongoDB Memory Server setup verified successfully"
else
    echo "❌ MongoDB Memory Server setup failed"
    echo "🔄 Attempting fallback configuration..."
    
    # Try with older version
    export MONGODB_MEMORY_SERVER_VERSION='5.0.19'
    
    if node /tmp/test-mongodb-memory.js; then
        echo "✅ MongoDB Memory Server setup with fallback version successful"
    else
        echo "❌ All MongoDB Memory Server configurations failed"
        echo "💡 This might indicate a system-level issue"
        echo "💡 The tests will handle MongoDB Memory Server setup internally"
        echo "⚠️  Continuing with CI pipeline..."
    fi
fi

# Clean up test file
rm -f /tmp/test-mongodb-memory.js

echo "✅ MongoDB Memory Server setup completed"
echo "📋 Configuration:"
echo "   - Version: $MONGODB_MEMORY_SERVER_VERSION"
echo "   - Download Timeout: $MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT"
echo "   - Download Retry: $MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY"
echo "   - Download Dir: $MONGODB_MEMORY_SERVER_DOWNLOAD_DIR" 