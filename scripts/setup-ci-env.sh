#!/bin/bash

# Setup CI Environment Variables
# This script sets up the environment for CI testing

set -e

echo "🔧 Setting up CI environment variables..."

# Export CI environment variables
export NODE_ENV=test
export CI=true
export INTEGRATION_TEST=true

# Database configuration
export MONGODB_URI=mongodb://localhost:27017/vegan-city-guide-test

# Redis configuration
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=

# JWT configuration
export JWT_SECRET=test-jwt-secret-key-for-github-actions-very-long-and-secure-key
export JWT_REFRESH_SECRET=test-refresh-secret-key-for-github-actions-very-long-and-secure-key
export BCRYPT_SALT_ROUNDS=4

# Disable rate limiting and external services
export DISABLE_RATE_LIMIT=true
export GOOGLE_MAPS_API_KEY=test-api-key
export EMAIL_SERVICE_DISABLED=true

echo "✅ CI environment variables configured"
echo "📋 Environment summary:"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - CI: $CI"
echo "   - MONGODB_URI: $MONGODB_URI"
echo "   - REDIS_HOST: $REDIS_HOST"
echo "   - REDIS_PORT: $REDIS_PORT" 