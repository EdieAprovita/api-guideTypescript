#!/bin/bash

# CI Environment Cleanup Script
# This script cleans up resources after test runs in CI

set -e

echo "🧹 Starting CI environment cleanup..."

# Function to safely kill processes
safe_kill() {
    local process_name="$1"
    local pids=$(pgrep -f "$process_name" 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        echo "   - Killing $process_name processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        # Force kill if still running
        local remaining_pids=$(pgrep -f "$process_name" 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            echo "   - Force killing remaining $process_name processes: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    else
        echo "   - No $process_name processes found"
    fi
}

# Clean up MongoDB processes
echo ""
echo "💾 Cleaning up MongoDB processes..."
safe_kill "mongod"
safe_kill "mongodb"

# Clean up Node.js test processes
echo ""
echo "🟢 Cleaning up Node.js test processes..."
safe_kill "vitest"
safe_kill "node.*test"

# Clean up temporary directories
echo ""
echo "📁 Cleaning up temporary directories..."

# MongoDB Memory Server cache
MONGODB_CACHE_DIRS=(
    "/tmp/mongodb-binaries"
    "$HOME/.cache/mongodb-binaries"
    "${MONGODB_MEMORY_SERVER_DOWNLOAD_DIR:-}"
)

for dir in "${MONGODB_CACHE_DIRS[@]}"; do
    if [ -n "$dir" ] && [ -d "$dir" ]; then
        echo "   - Cleaning MongoDB cache: $dir"
        du -sh "$dir" 2>/dev/null || echo "     (size unknown)"
        rm -rf "$dir" 2>/dev/null || echo "     (cleanup failed, continuing...)"
    fi
done

# Test result directories
TEST_DIRS=(
    "test-results"
    "coverage"
    "playwright-report"
    "test-reports"
    ".nyc_output"
)

for dir in "${TEST_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   - Cleaning test directory: $dir"
        du -sh "$dir" 2>/dev/null || echo "     (size unknown)"
        rm -rf "$dir" 2>/dev/null || echo "     (cleanup failed, continuing...)"
    fi
done

# Clean up node_modules cache if needed (only in extreme cases)
if [ "$FORCE_CLEAN_NODE_MODULES" = "true" ]; then
    echo ""
    echo "🧹 Force cleaning node_modules (FORCE_CLEAN_NODE_MODULES=true)..."
    if [ -d "node_modules" ]; then
        echo "   - Removing node_modules directory..."
        rm -rf node_modules
        echo "   - Running npm ci to reinstall..."
        npm ci --silent
    fi
fi

# Clean up temporary files
echo ""
echo "🗑️  Cleaning up temporary files..."
temp_patterns=(
    "/tmp/tmp-*"
    "/tmp/vitest-*"
    "/tmp/mongodb-*"
    "/tmp/test-*"
)

for pattern in "${temp_patterns[@]}"; do
    files=$(find /tmp -name "$(basename "$pattern")" -type f -o -name "$(basename "$pattern")" -type d 2>/dev/null | head -20 || true)
    if [ -n "$files" ]; then
        echo "   - Cleaning temp files matching $pattern:"
        echo "$files" | while read -r file; do
            echo "     $file"
            rm -rf "$file" 2>/dev/null || true
        done
    fi
done

# Clean up port locks (if any)
echo ""
echo "🔒 Cleaning up port locks..."
ports_to_check=(27017 6379 5000 5001 3000)

for port in "${ports_to_check[@]}"; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "   - Port $port is in use by processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 1
        # Check again and force kill if needed
        remaining_pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            echo "   - Force killing processes on port $port: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    else
        echo "   - Port $port is free"
    fi
done

# System cleanup (optional)
if [ "$CI" = "true" ]; then
    echo ""
    echo "🧽 System cleanup for CI..."
    
    # Free up memory caches
    if command -v sync >/dev/null 2>&1; then
        echo "   - Syncing filesystem..."
        sync
    fi
    
    # Show final resource usage
    echo ""
    echo "📊 Final resource usage:"
    if command -v free >/dev/null 2>&1; then
        echo "   - Memory usage:"
        free -h | grep -E "(Mem|Swap)"
    fi
    
    if command -v df >/dev/null 2>&1; then
        echo "   - Disk usage:"
        df -h / /tmp 2>/dev/null | grep -v "^Filesystem"
    fi
    
    # Show process count
    if command -v ps >/dev/null 2>&1; then
        process_count=$(ps aux | wc -l)
        echo "   - Running processes: $process_count"
    fi
fi

echo ""
echo "✅ CI environment cleanup completed"

# Exit with success
exit 0