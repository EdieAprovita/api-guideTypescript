#!/bin/bash

# Script para ejecutar pruebas de integración con implementaciones reales
# Sin mocks de controladores

echo "=== EJECUTANDO PRUEBAS DE INTEGRACIÓN SIN MOCKS ==="
echo "Configuración:"
echo "- Jest config: jest.config.integration.js"
echo "- Setup: jest.integration.setup.ts (sin mocks de controladores)"
echo "- Debug: habilitado"
echo ""

# Configurar variables de entorno para debug
export TEST_DEBUG=true
export NODE_ENV=test

# Ejecutar pruebas de integración de autenticación
echo "Ejecutando pruebas de autenticación con implementaciones reales..."

npx jest \
  --config=jest.config.integration.js \
  --testPathPatterns="auth.integration.test.ts" \
  --verbose \
  --no-cache \
  --no-coverage \
  --runInBand \
  --detectOpenHandles \
  --forceExit

echo ""
echo "=== PRUEBAS COMPLETADAS ==="
