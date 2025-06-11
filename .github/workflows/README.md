# GitHub Actions Workflows

## Mejoras Implementadas

Este directorio contiene los workflows de GitHub Actions optimizados para el proyecto. Se han implementado las siguientes mejoras:

### ✅ Cambios Realizados

1. **Unificación de Workflows**

    - Consolidado `test`, `build` y `security` en un flujo más eficiente
    - Eliminado workflow duplicado `build-test.yml` (obsoleto)

2. **Optimización de Cache**

    - Implementado `cache: 'npm'` con `cache-dependency-path: package-lock.json`
    - Cache compartido entre jobs para evitar instalaciones repetidas

3. **Concurrencia y Cancelación**

    - Agregado `concurrency` para cancelar ejecuciones previas en la misma rama
    - Ahorro de recursos y tiempo de ejecución

4. **Versiones Actualizadas**

    - Todas las acciones actualizadas a `@v4`
    - Node.js unificado en versión `18.x`
    - Eliminadas versiones obsoletas (14.x, 16.x)

5. **Auditoría de Seguridad Optimizada**

    - Ejecuta solo en push a `main` para reducir tiempo
    - Separado en niveles críticos y altos
    - Instalación solo de dependencias de producción

6. **Variables de Entorno**

    - `CI=true` establecido globalmente
    - Mejor comportamiento de Jest y otras herramientas

7. **Gestión de Artefactos**
    - Retención de 7 días para artefactos de build
    - Upload de coverage con `continue-on-error: true`

### 🏗️ Estructura del Workflow Principal

```yaml
jobs:
    test-and-build: # Pruebas, lint, type-check y build unificados
    security: # Auditoría de seguridad (solo en main)
    deploy: # Placeholder para deployment futuro
```

### 📋 Comandos Disponibles

- `npm run test:ci` - Pruebas con coverage
- `npm run type-check` - Verificación de tipos
- `npm run lint` - Linting del código
- `npm run format:check` - Verificación de formato
- `npm run build` - Construcción del proyecto

### 🔒 Seguridad

- Auditoría de vulnerabilidades críticas y altas
- Instalación solo de dependencias de producción para auditoría
- Pinning de versiones de acciones para reproducibilidad

### 📈 Beneficios

- ⚡ Reducción del tiempo de ejecución
- 💰 Menor consumo de recursos de GitHub Actions
- 🔄 Eliminación de duplicación de código
- 🛡️ Mejor seguridad y reproducibilidad
- 📊 Mejor gestión de artefactos y coverage
