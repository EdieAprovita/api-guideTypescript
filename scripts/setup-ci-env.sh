#!/bin/bash

# Setup CI Environment Variables
# This script sets up the environment for CI testing with robust error handling

set -e

echo "🔧 Setting up CI environment variables..."

# Export CI environment variables
export NODE_ENV=test
export CI=true
export INTEGRATION_TEST=true

# MongoDB Memory Server configuration with CI-friendly settings
export MONGODB_MEMORY_SERVER_VERSION='5.0.19'  # More stable version for CI
export MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT='120000'  # Longer timeout
export MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY='3'
export MONGODB_MEMORY_SERVER_DOWNLOAD_DIR='/tmp/mongodb-binaries'
export MONGODB_MEMORY_SERVER_LAUNCH_TIMEOUT='60000'

# Database configuration - prefer Memory Server for CI consistency
# Use IPv4 explicitly to avoid Node.js 18+ IPv6 preference issues
unset MONGODB_URI  # Let the test setup handle this
export MONGODB_TEST_URI=test-integration
export MONGODB_FALLBACK_URI=mongodb://127.0.0.1:27017/test-integration

# Redis configuration for CI - use IPv4 explicitly
export REDIS_HOST=127.0.0.1
export REDIS_PORT=6379
export REDIS_PASSWORD=
export REDIS_LAZYCONNECT=true

# JWT configuration with longer keys for security
export JWT_SECRET=test-jwt-secret-key-for-github-actions-very-long-and-secure-key-with-enough-entropy-for-testing
export JWT_REFRESH_SECRET=test-refresh-secret-key-for-github-actions-very-long-and-secure-key-with-enough-entropy-for-testing
export BCRYPT_SALT_ROUNDS=4

# Disable external services and rate limiting
export DISABLE_RATE_LIMIT=true
export GOOGLE_MAPS_API_KEY=test-api-key-for-ci-testing
export EMAIL_SERVICE_DISABLED=true
export DISABLE_EXTERNAL_APIS=true

# Test configuration with generous timeouts for CI
export VITEST_TIMEOUT=60000
export VITEST_HOOK_TIMEOUT=180000
export VITEST_TEARDOWN_TIMEOUT=60000

# Memory and performance optimizations for CI
export NODE_OPTIONS="--max-old-space-size=4096"
export FORCE_COLOR=1  # Better CI output

# Create necessary directories
mkdir -p /tmp/mongodb-binaries
mkdir -p test-results

# Verify dependencies
echo "🔍 Verifying CI environment..."

# Check Node.js version
node_version=$(node --version)
echo "   - Node.js: $node_version"

# Check available memory
if command -v free >/dev/null 2>&1; then
    available_memory=$(free -h | grep "Mem:" | awk '{print $7}')
    echo "   - Available memory: $available_memory"
fi

# Check disk space
if command -v df >/dev/null 2>&1; then
    disk_space=$(df -h /tmp | tail -1 | awk '{print $4}')
    echo "   - Available disk space in /tmp: $disk_space"
fi

echo "✅ CI environment variables configured"
echo "📋 Environment summary:"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - CI: $CI"
echo "   - MONGODB_MEMORY_SERVER_VERSION: $MONGODB_MEMORY_SERVER_VERSION"
echo "   - MONGODB_MEMORY_SERVER_DOWNLOAD_DIR: $MONGODB_MEMORY_SERVER_DOWNLOAD_DIR"
echo "   - REDIS_HOST: $REDIS_HOST:$REDIS_PORT"
echo "   - Test timeouts: $VITEST_TIMEOUT ms / $VITEST_HOOK_TIMEOUT ms" 