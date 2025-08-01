#!/bin/bash

# Setup MongoDB for CI environment
# This script sets up a MongoDB instance for integration tests in CI

set -e

echo "🔧 Setting up MongoDB for CI environment..."

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is already running"
    exit 0
fi

# Try to start MongoDB using different methods
echo "🚀 Starting MongoDB..."

# Method 1: Try to start MongoDB service
if command -v systemctl &> /dev/null; then
    echo "📦 Attempting to start MongoDB via systemctl..."
    sudo systemctl start mongod || true
    sleep 2
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB started via systemctl"
        exit 0
    fi
fi

# Method 2: Try to start MongoDB manually
if command -v mongod &> /dev/null; then
    echo "📦 Starting MongoDB manually..."
    mkdir -p /tmp/mongodb-data
    mongod --dbpath /tmp/mongodb-data --port 27017 --fork --logpath /tmp/mongodb.log || true
    sleep 3
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB started manually"
        exit 0
    fi
fi

# Method 3: Use Docker if available
if command -v docker &> /dev/null; then
    echo "🐳 Starting MongoDB via Docker..."
    docker run -d --name mongodb-ci -p 27017:27017 mongo:6.0 || true
    sleep 5
    if docker ps | grep -q mongodb-ci; then
        echo "✅ MongoDB started via Docker"
        exit 0
    fi
fi

echo "⚠️  Could not start MongoDB automatically"
echo "📋 Please ensure MongoDB is running on localhost:27017"
echo "💡 You can start it manually with: mongod --dbpath /tmp/mongodb-data"

# Don't fail the script - let the tests handle the connection
exit 0 