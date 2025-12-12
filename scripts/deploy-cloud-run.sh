#!/bin/bash

# 🚀 Cloud Run Deployment Script with Pre-flight Checks
# This script verifies configuration and deploys to Cloud Run

set -e

echo "🚀 Cloud Run Deployment Script"
echo "==============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="vegan-vita-402514"
REGION="europe-west1"
SERVICE_NAME="api-guidetypescript"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No estás en el directorio del proyecto${NC}"
    exit 1
fi

echo -e "${BLUE}� Running pre-flight checks...${NC}"
echo ""

# Run verification script
if [ -f "scripts/verify-cloud-run-config.sh" ]; then
    if ./scripts/verify-cloud-run-config.sh; then
        echo ""
        echo -e "${GREEN}✓ Pre-flight checks passed!${NC}"
    else
        echo ""
        echo -e "${RED}✗ Pre-flight checks failed${NC}"
        echo "Please fix the issues before deploying"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Verification script not found, skipping pre-flight checks${NC}"
fi

echo ""
echo -e "${BLUE}📋 Modified files:${NC}"
git status --short

echo ""
read -p "Do you want to commit and push changes? [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo -e "${BLUE}📦 Preparing commit...${NC}"
    
    # Add all changed files
    git add -A
    
    echo ""
    read -p "Enter commit message: " COMMIT_MSG
    
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="fix: Cloud Run deployment fixes - non-blocking DB and correct port binding"
    fi
    
    # Commit
    git commit -m "$COMMIT_MSG" || echo -e "${YELLOW}⚠ No changes to commit${NC}"
    
    # Push
    CURRENT_BRANCH=$(git branch --show-current)
    echo ""
    echo -e "${BLUE}🚀 Pushing to origin/${CURRENT_BRANCH}...${NC}"
    git push origin $CURRENT_BRANCH
    
    echo ""
    echo -e "${GREEN}✅ Push successful!${NC}"
fi

echo ""
echo -e "${BLUE}☁️  Deploying to Cloud Run...${NC}"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with gcloud${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Make sure these environment variables are set in Cloud Run:${NC}"
echo "   - MONGODB_URI (required)"
echo "   - NODE_ENV=production"
echo "   - ENABLE_SWAGGER_UI=true (optional)"
echo ""

read -p "Are environment variables configured in Cloud Run? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo ""
    echo -e "${BLUE}Setting environment variables...${NC}"
    read -p "Enter MONGODB_URI: " MONGODB_URI
    
    if [ -z "$MONGODB_URI" ]; then
        echo -e "${RED}❌ MONGODB_URI is required${NC}"
        exit 1
    fi
    if [[ "$MONGODB_URI" == *"'"* ]]; then
        echo -e "${RED}❌ MONGODB_URI must not contain single quotes (').${NC}"
        exit 1
    fi
    
    echo "Setting environment variables in Cloud Run..."
    gcloud run services update $SERVICE_NAME \
        --region=$REGION \
        --update-env-vars='NODE_ENV=production,MONGODB_URI='"'$MONGODB_URI'"',ENABLE_SWAGGER_UI=true'
fi

echo ""
echo -e "${BLUE}🏗️  Triggering Cloud Build...${NC}"
echo ""

# Get latest commit SHA
COMMIT_SHA=$(git rev-parse HEAD)

echo "Deploying commit: $COMMIT_SHA"
echo ""

# Trigger Cloud Build (assuming there's a trigger configured)
echo "Cloud Build will be triggered automatically by the push."
echo ""

echo "📊 Monitor the deployment:"
echo "   Build: https://console.cloud.google.com/cloud-build?project=$PROJECT_ID"
echo "   Service: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/logs?project=$PROJECT_ID"
echo ""

# Wait a bit and try to get the service URL
sleep 5

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" 2>/dev/null || echo "")

if [ -n "$SERVICE_URL" ]; then
    echo ""
    echo -e "${GREEN}🎯 Service URL: $SERVICE_URL${NC}"
    echo ""
    echo "Once deployment completes, test with:"
    echo "   curl $SERVICE_URL/health"
    echo "   curl $SERVICE_URL/api/v1"
fi

echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "⏳ Wait for Cloud Build to complete (this may take 4-5 minutes)"
echo ""
echo "Deployment checklist:"
echo "  □ Cloud Build shows ✅ for all steps (Build, Push, Deploy)"
echo "  □ Cloud Run service status is 'Running'"
echo "  □ Health check returns 200: curl \$SERVICE_URL/health"
echo "  □ API responds: curl \$SERVICE_URL/api/v1"
echo "  □ Check logs for MongoDB connection status"
echo ""
