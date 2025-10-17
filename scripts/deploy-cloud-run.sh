#!/bin/bash

# 🚀 Fast Deploy Script for Cloud Run
# This script safely commits and pushes changes

set -e

echo "🚀 Cloud Run Deployment Script"
echo "==============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No estás en el directorio del proyecto"
    exit 1
fi

echo -e "${BLUE}📋 Archivos modificados:${NC}"
git status --short

echo ""
read -p "¿Deseas probar localmente antes de hacer push? (recomendado) [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo "🧪 Ejecutando prueba local..."
    ./scripts/test-cloud-run-local.sh
    
    echo ""
    read -p "¿Las pruebas pasaron exitosamente? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        echo "❌ Abortando deployment. Por favor corrige los errores."
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}📦 Preparando commit...${NC}"

# Add all files
git add Dockerfile \
        healthcheck.js \
        package.json \
        src/app.ts \
        src/server.ts \
        CLOUD_RUN_FIX.md \
        docs/cloud-run-fixes.md \
        scripts/test-cloud-run-local.sh

echo -e "${GREEN}✅ Archivos añadidos al stage${NC}"

# Commit message
COMMIT_MSG="fix: Cloud Run deployment - correct port binding and non-blocking DB connection

🔧 Critical fixes for Cloud Run deployment:

- Changed default port from 5001 to 8080 (Cloud Run requirement)
- Server now listens on 0.0.0.0 in production (was localhost only)
- MongoDB connection is now non-blocking (prevents startup timeout)
- Increased health check timeouts (start-period: 15s -> 40s)
- Updated healthcheck.js for better Cloud Run compatibility
- Fixed docker:run script to use port 8080

📋 Files changed:
- src/server.ts: Port 8080 default, listen on 0.0.0.0 in production
- src/app.ts: Non-blocking MongoDB connection
- Dockerfile: Increased health check timeouts
- healthcheck.js: Better logging and timeout handling
- package.json: Updated docker:run script

🧪 Testing:
Run ./scripts/test-cloud-run-local.sh to verify locally

📚 Documentation:
See CLOUD_RUN_FIX.md for detailed explanation and troubleshooting

Fixes #container-startup-timeout"

echo ""
echo -e "${BLUE}📝 Mensaje del commit:${NC}"
echo "$COMMIT_MSG"
echo ""

read -p "¿Proceder con el commit? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo "❌ Commit cancelado"
    git reset HEAD
    exit 1
fi

# Commit
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✅ Commit realizado${NC}"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Verifica que tengas estas variables configuradas en Cloud Run:${NC}"
echo "   - MONGODB_URI"
echo "   - NODE_ENV (debería ser 'production')"
echo ""

read -p "¿Hacer push a development y activar Cloud Build? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo "❌ Push cancelado"
    echo "💡 Puedes hacer push manualmente con: git push origin development"
    exit 1
fi

# Push
CURRENT_BRANCH=$(git branch --show-current)
echo ""
echo -e "${BLUE}🚀 Pushing to origin/${CURRENT_BRANCH}...${NC}"
git push origin $CURRENT_BRANCH

echo ""
echo -e "${GREEN}✅ Push exitoso!${NC}"
echo ""
echo "📊 Monitorea el deployment en:"
echo "   https://console.cloud.google.com/cloud-build?project=vegan-vita-402514"
echo ""
echo "📋 Logs de Cloud Run:"
echo "   https://console.cloud.google.com/run/detail/europe-west1/api-guidetypescript/logs?project=vegan-vita-402514"
echo ""
echo "🎯 Una vez que el deployment termine, verifica:"
echo "   - Cloud Build debe mostrar ✅ en los 3 steps (Build, Push, Deploy)"
echo "   - Cloud Run debe mostrar el servicio como 'Running'"
echo "   - Prueba el endpoint: curl https://tu-url.run.app/health"
echo ""
