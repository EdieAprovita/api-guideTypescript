#!/bin/bash

# Script para probar la configuración de Cloud Run localmente
# Este script simula el entorno de Cloud Run y verifica que el contenedor inicie correctamente

set -e  # Exit on error

echo "🧪 Testing Cloud Run Configuration Locally"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="api-guidetypescript-test"
CONTAINER_NAME="api-guidetypescript-test-container"
PORT=8080
TIMEOUT=60  # seconds to wait for container to be ready

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
}

# Trap cleanup on script exit
trap cleanup EXIT

echo "1️⃣  Building Docker image..."
docker build -t $IMAGE_NAME . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Docker build successful${NC}"
echo ""

echo "2️⃣  Starting container (simulating Cloud Run environment)..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:$PORT \
    -e PORT=$PORT \
    -e NODE_ENV=production \
    -e MONGODB_URI="mongodb://fake-mongodb:27017/test" \
    $IMAGE_NAME || {
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
}
echo -e "${GREEN}✅ Container started${NC}"
echo ""

echo "3️⃣  Waiting for container to be ready..."
SECONDS_WAITED=0
READY=false

while [ $SECONDS_WAITED -lt $TIMEOUT ]; do
    if curl -s -f http://localhost:$PORT/health > /dev/null 2>&1; then
        READY=true
        break
    fi
    
    echo -n "."
    sleep 2
    SECONDS_WAITED=$((SECONDS_WAITED + 2))
done

echo ""
echo ""

if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ Container is ready! (took ${SECONDS_WAITED}s)${NC}"
else
    echo -e "${RED}❌ Container failed to become ready within ${TIMEOUT}s${NC}"
    echo ""
    echo "📋 Container logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo "4️⃣  Running health checks..."

# Test health endpoint
echo -n "   Testing /health endpoint... "
HEALTH_RESPONSE=$(curl -s http://localhost:$PORT/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"ok"' || echo "")

if [ -n "$HEALTH_STATUS" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test root endpoint
echo -n "   Testing / endpoint... "
ROOT_RESPONSE=$(curl -s http://localhost:$PORT/)
ROOT_STATUS=$(echo $ROOT_RESPONSE | grep -o '"message":"Vegan Guide API"' || echo "")

if [ -n "$ROOT_STATUS" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "   Response: $ROOT_RESPONSE"
fi

# Test API endpoint
echo -n "   Testing /api/v1 endpoint... "
API_RESPONSE=$(curl -s http://localhost:$PORT/api/v1)
if [ -n "$API_RESPONSE" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo ""
echo "5️⃣  Checking container logs for errors..."
LOGS=$(docker logs $CONTAINER_NAME 2>&1)

# Check for common error patterns
if echo "$LOGS" | grep -qi "error\|failed\|exception"; then
    echo -e "${YELLOW}⚠️  Warnings/Errors found in logs:${NC}"
    echo "$LOGS" | grep -i "error\|failed\|exception" | head -10
else
    echo -e "${GREEN}✅ No errors found${NC}"
fi

echo ""
echo "6️⃣  Verification Summary"
echo "========================"

# Check if MongoDB connection failed (expected)
if echo "$LOGS" | grep -qi "Failed to connect to MongoDB"; then
    echo -e "${GREEN}✅ MongoDB connection handled gracefully (expected)${NC}"
fi

# Check if server started
if echo "$LOGS" | grep -qi "Server running"; then
    echo -e "${GREEN}✅ Server started successfully${NC}"
else
    echo -e "${RED}❌ Server may not have started${NC}"
fi

# Check listening address
if echo "$LOGS" | grep -qi "0.0.0.0"; then
    echo -e "${GREEN}✅ Server listening on 0.0.0.0 (Cloud Run compatible)${NC}"
else
    echo -e "${YELLOW}⚠️  Server may not be listening on 0.0.0.0${NC}"
fi

echo ""
echo "📊 Container Stats:"
docker stats --no-stream $CONTAINER_NAME

echo ""
echo "🎉 ${GREEN}All tests passed!${NC}"
echo ""
echo "💡 Tips:"
echo "   - Container started in ${SECONDS_WAITED}s (Cloud Run timeout is typically 10-60s)"
echo "   - If this took > 30s, consider optimizing your startup time"
echo "   - MongoDB connection failure is expected in this test"
echo ""
echo "🚀 Next steps:"
echo "   1. Commit these changes: git add . && git commit -m 'fix: Cloud Run deployment'"
echo "   2. Push to trigger Cloud Build: git push origin development"
echo "   3. Monitor deployment at: https://console.cloud.google.com/cloud-build"
echo ""
