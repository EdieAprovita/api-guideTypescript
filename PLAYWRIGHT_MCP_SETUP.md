# Playwright MCP Configuration

## Problema Resuelto

El error original:
```
Error spawn npx @playwright/mcp@latest ENOENT
```

Este error se debe a que VS Code no podía encontrar o ejecutar el comando `npx @playwright/mcp@latest`. 

## Solución Implementada

### 1. Actualización de Node.js
- **Problema**: Se requiere Node.js >= 20.0.0
- **Solución**: Actualizado a Node.js 22.16.0 usando nvm

### 2. Instalación de Playwright MCP
```bash
# Globalmente
npm install -g @playwright/mcp@latest

# Localmente en el proyecto
npm install --save-dev @playwright/mcp @playwright/test
```

### 3. Script Wrapper
Creado `playwright-mcp-wrapper.sh` para asegurar que VS Code use el PATH correcto:

```bash
#!/bin/bash
export PATH="/Users/edgarchavero/.nvm/versions/node/v22.16.0/bin:$PATH"
export NODE_PATH="/Users/edgarchavero/.nvm/versions/node/v22.16.0/lib/node_modules"
exec npx @playwright/mcp@latest "$@"
```

### 4. Configuración de VS Code
Actualizado `.vscode/settings.json`:

```json
{
  "mcp": {
    "inputs": [],
    "servers": {
      "playwright": {
        "command": "/Volumes/EACM/Developer-Projects/api-guideTypescript/playwright-mcp-wrapper.sh",
        "args": []
      }
    }
  },
  "terminal.integrated.env.osx": {
    "PATH": "/Users/edgarchavero/.nvm/versions/node/v22.16.0/bin:${env:PATH}"
  },
  "playwright.reuseBrowser": true,
  "playwright.showTrace": true
}
```

### 5. Configuración de Playwright
- Creado `playwright.config.ts` con configuración básica
- Creado directorio `src/test/e2e/` para pruebas end-to-end
- Añadidos scripts npm para pruebas e2e:
  - `npm run test:e2e` - Ejecutar pruebas
  - `npm run test:e2e:ui` - Modo UI
  - `npm run test:e2e:headed` - Con navegador visible
  - `npm run test:e2e:debug` - Modo debug

### 6. Instalación de Navegadores
```bash
npx playwright install
```

## Verificación

Para verificar que todo funciona:

1. **Comando directo**: `npx @playwright/mcp@latest --version`
2. **Script wrapper**: `./playwright-mcp-wrapper.sh --version`
3. **Pruebas e2e**: `npm run test:e2e`

## Notas Importantes

- **VS Code**: Reiniciar VS Code después de estos cambios para que tome la nueva configuración
- **PATH**: El script wrapper asegura que VS Code use la versión correcta de Node.js y npm
- **Navegadores**: Algunos navegadores pueden estar congelados en macOS 12, pero esto no afecta la funcionalidad principal
- **Servidor**: Las pruebas e2e requieren que el servidor esté corriendo en `http://localhost:5001`

## Próximos Pasos

1. Reiniciar VS Code
2. Verificar que Playwright MCP funcione en la extensión
3. Desarrollar más pruebas e2e para la API
4. Configurar CI/CD para ejecutar pruebas automáticamente
