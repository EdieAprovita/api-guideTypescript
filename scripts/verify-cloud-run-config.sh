#!/bin/bash

# Cloud Run Configuration Verification Script
# This script verifies that all necessary configurations are in place before deploying to Cloud Run

set -e

echo "🔍 Verifying Cloud Run Configuration..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

# Function to print check result
check_ok() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS++))
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
    ((CHECKS++))
}

check_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
    ((CHECKS++))
}

echo "1. Checking Docker Configuration..."
echo "=================================="

# Check if Dockerfile exists
if [ -f "Dockerfile" ]; then
    check_ok "Dockerfile exists"
    
    # Check if Dockerfile uses 0.0.0.0
    if grep -q "EXPOSE 8080" Dockerfile; then
        check_ok "Port 8080 is exposed in Dockerfile"
    else
        check_error "Port 8080 is not exposed in Dockerfile"
    fi
    
    # Check if multi-stage build is used
    if grep -q "AS builder" Dockerfile && grep -q "AS production" Dockerfile; then
        check_ok "Multi-stage build is configured"
    else
        check_warning "Multi-stage build not found (optional optimization)"
    fi
else
    check_error "Dockerfile not found"
fi

echo ""
echo "2. Checking Server Configuration..."
echo "===================================="

# Check server.ts for correct HOST binding
if [ -f "src/server.ts" ]; then
    check_ok "src/server.ts exists"
    
    if grep -q "0.0.0.0" src/server.ts; then
        check_ok "Server is configured to listen on 0.0.0.0"
    else
        check_error "Server must listen on 0.0.0.0 (not localhost)"
    fi
    
    if grep -q "process.env.PORT" src/server.ts; then
        check_ok "Server uses PORT environment variable"
    else
        check_error "Server must use process.env.PORT"
    fi
else
    check_error "src/server.ts not found"
fi

echo ""
echo "3. Checking Health Check Configuration..."
echo "=========================================="

if [ -f "healthcheck.cjs" ]; then
    check_ok "healthcheck.cjs exists"
    
    if grep -q "/health" healthcheck.cjs; then
        check_ok "Health check endpoint is configured"
    else
        check_error "Health check endpoint not found"
    fi
else
    check_warning "healthcheck.cjs not found (optional)"
fi

# Check health routes
if [ -f "src/routes/healthRoutes.ts" ]; then
    check_ok "Health routes exist"
    
    if grep -q "router.get('/'" src/routes/healthRoutes.ts; then
        check_ok "Liveness probe endpoint configured"
    fi
    
    if grep -q "router.get('/ready'" src/routes/healthRoutes.ts; then
        check_ok "Readiness probe endpoint configured"
    fi
else
    check_error "src/routes/healthRoutes.ts not found"
fi

echo ""
echo "4. Checking Database Configuration..."
echo "======================================"

if [ -f "src/config/db.ts" ]; then
    check_ok "Database configuration exists"
    
    if grep -q "serverSelectionTimeoutMS" src/config/db.ts; then
        check_ok "Database timeout is configured"
    else
        check_warning "Database timeout not explicitly set"
    fi
else
    check_error "src/config/db.ts not found"
fi

# Check if app.ts has non-blocking DB connection
if [ -f "src/app.ts" ]; then
    if grep -q ".catch" src/app.ts && grep -q "connectDB" src/app.ts; then
        check_ok "Database connection is non-blocking"
    else
        check_error "Database connection may be blocking server startup"
    fi
else
    check_error "src/app.ts not found"
fi

echo ""
echo "5. Checking Environment Variables..."
echo "====================================="

# Check for .env.example
if [ -f "env.example" ]; then
    check_ok "env.example exists"
    
    required_vars=("MONGODB_URI" "NODE_ENV" "PORT")
    for var in "${required_vars[@]}"; do
        if grep -q "$var" env.example; then
            check_ok "Required variable $var is documented"
        else
            check_warning "Variable $var not documented in env.example"
        fi
    done
else
    check_warning "env.example not found"
fi

echo ""
echo "6. Checking Package Dependencies..."
echo "===================================="

if [ -f "package.json" ]; then
    check_ok "package.json exists"
    
    # Check for required dependencies
    if grep -q '"express"' package.json; then
        check_ok "Express is installed"
    fi
    
    if grep -q '"mongoose"' package.json; then
        check_ok "Mongoose is installed"
    fi
    
    # Check build script
    if grep -q '"build"' package.json; then
        check_ok "Build script is configured"
    else
        check_error "Build script not found in package.json"
    fi
else
    check_error "package.json not found"
fi

echo ""
echo "7. Testing Docker Build..."
echo "==========================="

if command -v docker &> /dev/null; then
    check_ok "Docker is installed"
    
    echo "   Building Docker image (this may take a while)..."
    if docker build -t api-guidetypescript-test . > /dev/null 2>&1; then
        check_ok "Docker image builds successfully"
        
        # Clean up test image
        docker rmi api-guidetypescript-test > /dev/null 2>&1 || true
    else
        check_error "Docker build failed - check Dockerfile"
    fi
else
    check_warning "Docker not installed - skipping build test"
fi

echo ""
echo "8. Checking Cloud Run Service Configuration..."
echo "================================================"

# Check if gcloud is installed
if command -v gcloud &> /dev/null; then
    check_ok "gcloud CLI is installed"
    
    # Try to get service info
    SERVICE_NAME="api-guidetypescript"
    REGION="europe-west1"
    
    if gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" &> /dev/null; then
        check_ok "Cloud Run service exists"
        
        # Check environment variables
        ENV_VARS=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(spec.template.spec.containers[0].env)")
        
        if echo "$ENV_VARS" | grep -q "NODE_ENV"; then
            check_ok "NODE_ENV is set in Cloud Run"
        else
            check_warning "NODE_ENV not set in Cloud Run service"
        fi
        
        if echo "$ENV_VARS" | grep -q "MONGODB_URI"; then
            check_ok "MONGODB_URI is set in Cloud Run"
        else
            check_error "MONGODB_URI not set in Cloud Run service"
        fi
    else
        check_warning "Cloud Run service not found or not accessible"
    fi
else
    check_warning "gcloud CLI not installed - skipping Cloud Run checks"
fi

echo ""
echo "============================================"
echo "Verification Summary"
echo "============================================"
echo -e "Total checks: ${CHECKS}"
echo -e "${GREEN}Passed: $((CHECKS - ERRORS - WARNINGS))${NC}"
echo -e "${YELLOW}Warnings: ${WARNINGS}${NC}"
echo -e "${RED}Errors: ${ERRORS}${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo "You can proceed with deployment to Cloud Run."
    exit 0
else
    echo -e "${RED}✗ Found ${ERRORS} critical error(s)${NC}"
    echo "Please fix the errors before deploying to Cloud Run."
    exit 1
fi
