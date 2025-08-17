#!/bin/bash

echo "📊 Checking test coverage..."

# Run tests with coverage
echo "🧪 Running tests with coverage..."
npm run test:coverage

# Check if coverage passed
if [ $? -eq 0 ]; then
    echo "✅ Tests passed!"
else
    echo "❌ Some tests failed or coverage thresholds not met"
    exit 1
fi

echo "📈 Coverage analysis complete!"
echo ""
echo "🎯 Next priority actions:"
echo "  1. Focus on controllers with 0% coverage"
echo "  2. Add integration tests for critical services"
echo "  3. Improve middleware test coverage"
echo ""
echo "📝 To implement specific tests:"
echo "  - Edit the generated test files in src/test/controllers/"
echo "  - Add real endpoint tests instead of placeholder tests"
echo "  - Use the cacheRoutes.test.ts as a reference"