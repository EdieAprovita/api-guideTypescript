#!/bin/bash

# Clean up old test files and configurations
echo "🧹 Cleaning up old test files..."

# Remove old test files
rm -f src/test/services/*.test.old
rm -f src/test/config/master-test-config.ts

# Remove duplicate or obsolete test configurations
if [ -f "src/test/config/test-config.ts" ]; then
    rm src/test/config/test-config.ts
fi

if [ -f "src/test/testConfig.ts" ]; then
    rm src/test/testConfig.ts
fi

# List remaining test files for verification
echo "✅ Remaining test files:"
find src/test -name "*.test.ts" | head -10

echo "🧹 Cleanup completed!"