#!/bin/bash

# Script to verify SonarQube configuration and duplication improvements
# This script helps validate that our code duplication optimizations are being measured correctly

echo "🔍 SonarQube Configuration Verification Script"
echo "============================================="
echo

# Check if sonar-scanner is available
if ! command -v sonar-scanner &> /dev/null; then
    echo "⚠️  sonar-scanner not found. Please install SonarQube Scanner first."
    echo "   Installation: https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/"
    exit 1
fi

# Check sonar-project.properties exists
if [ ! -f "sonar-project.properties" ]; then
    echo "❌ sonar-project.properties not found!"
    exit 1
fi

echo "✅ sonar-project.properties found"

# Display current duplication exclusions
echo
echo "📋 Current CPD Exclusions Configuration:"
echo "----------------------------------------"
grep "sonar.cpd.exclusions" sonar-project.properties || echo "No CPD exclusions found"

echo
echo "🎯 Files that WILL be analyzed for duplication:"
echo "-----------------------------------------------"

# List key files that should be included in analysis
key_files=(
    "src/test/middleware/errorHandler.test.ts"
    "src/test/utils/controllerTestHelpers.ts"
    "src/test/utils/middlewareTestHelpers.ts"
    "src/test/utils/responseExpectations.ts"
    "src/test/utils/mockGenerators.ts"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (not found)"
    fi
done

echo
echo "🚫 Files that WILL be excluded from analysis:"
echo "---------------------------------------------"

# List excluded files
excluded_files=(
    "src/test/setup.ts"
    "src/test/setupIsolated.ts"
    "src/test/__mocks__"
    "src/test/config"
    "src/test/constants"
)

for file in "${excluded_files[@]}"; do
    if [ -e "$file" ]; then
        echo "✅ $file (excluded)"
    else
        echo "❌ $file (not found)"
    fi
done

echo
echo "📊 Expected Duplication Improvements:"
echo "------------------------------------"
echo "Before optimization:"
echo "  - errorHandler.test.ts: 24.4% duplication"
echo "  - controllerTestHelpers.ts: 19.9% duplication"  
echo "  - middlewareTestHelpers.ts: 8.4% duplication"
echo
echo "After optimization (expected):"
echo "  - errorHandler.test.ts: ~5% duplication"
echo "  - controllerTestHelpers.ts: ~3% duplication"
echo "  - middlewareTestHelpers.ts: ~2% duplication"
echo "  - Overall: ≤ 3.0% duplication"

echo
echo "🔧 Configuration Verification:"
echo "------------------------------"

# Check if organization and project keys are set
if grep -q "your-organization-key" sonar-project.properties; then
    echo "⚠️  Organization key not configured (still shows 'your-organization-key')"
else
    echo "✅ Organization key configured"
fi

if grep -q "your-project-key" sonar-project.properties; then
    echo "⚠️  Project key not configured (still shows 'your-project-key')"
else
    echo "✅ Project key configured"
fi

# Check TypeScript configuration
if grep -q "sonar.typescript.tsconfigPath" sonar-project.properties; then
    echo "✅ TypeScript configuration found"
else
    echo "⚠️  TypeScript configuration missing"
fi

echo
echo "🚀 Ready to run analysis? Execute:"
echo "  sonar-scanner"
echo
echo "📈 After analysis, check SonarQube dashboard for:"
echo "  - Duplicated Lines (%) should be ≤ 3.0%"
echo "  - Verify optimized files appear in analysis"
echo "  - Confirm exclusions are working correctly"
echo

echo "✅ Configuration verification complete!" 