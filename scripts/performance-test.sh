#!/bin/bash

# Simple Performance Testing with Artillery
# Usage: ./scripts/performance-test.sh [target_url]

set -e

# Configuration
TARGET_URL=${1:-"http://localhost:5001"}
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/vegan-guide-test"}

echo "🚀 Performance Testing"
echo "📊 Target: $TARGET_URL"

# Build application
echo "🏗️ Building..."
npm run build >/dev/null 2>&1

# Set test environment
export NODE_ENV=test
export JWT_SECRET=test-secret
export MONGODB_URI=$MONGODB_URI
export PORT=5001

# Start server in background
echo "🚀 Starting server..."
node dist/server.js &
SERVER_PID=$!

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Wait for server
sleep 5

# Check if server is ready
if ! curl -s -f "$TARGET_URL/api/v1/restaurants" >/dev/null; then
    echo "❌ Server not responding"
    exit 1
fi

echo "✅ Server ready"

# Run Artillery test
echo "🎯 Running performance test..."

# Update artillery config with target URL
sed "s|http://localhost:5001|$TARGET_URL|g" artillery.config.yml > artillery.temp.yml

if npx artillery run artillery.temp.yml; then
    echo "✅ Performance test passed"
    rm -f artillery.temp.yml
    exit 0
else
    echo "❌ Performance test failed"
    rm -f artillery.temp.yml
    exit 1
fi