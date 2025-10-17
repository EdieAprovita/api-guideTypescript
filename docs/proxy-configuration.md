# 🔧 Configuración de Proxy y Rate Limiting para GCP

Este documento explica la configuración de proxy trust y rate limiting implementada para resolver problemas en Google Cloud Platform.

## 🚨 Problema Resuelto

**Error Original**: 
```
Express deprecated req.ip: Use req.socket.remoteAddress, or the trust proxy setting
```

**Causa**: Express no estaba configurado para confiar en proxies, por lo que no podía identificar correctamente las IPs reales de los clientes cuando está detrás de GCP.

**Impacto**:
- Rate limiting no funcionaba correctamente
- Todos los requests parecían venir de la misma IP
- Logs de seguridad imprecisos
- Posibles vulnerabilidades de seguridad

## ✅ Solución Implementada

### 1. Configuración de Trust Proxy

En `src/app.ts`:

```typescript
// 🔧 Configure Express to trust proxies (essential for GCP, Heroku, etc.)
// This allows Express to correctly identify real client IPs from X-Forwarded-For headers
if (process.env.NODE_ENV === 'production') {
    // In production (GCP), trust the first proxy
    app.set('trust proxy', 1);
} else {
    // In development, trust all proxies (for local testing with proxies)
    app.set('trust proxy', true);
}
```

### 2. Rate Limiting Mejorado

En `src/middleware/security.ts`:

- **Key Generator Mejorado**: Detecta IPs de múltiples fuentes
- **Logging Mejorado**: Rastrea violaciones de rate limit con información de IP
- **Fallback Robusto**: Maneja casos donde la IP no está disponible

### 3. Utilidades de Debugging

Nuevas funciones para monitorear la detección de IP en producción:

```typescript
export const getClientIPInfo = (req: Request) => {
    // Returns comprehensive IP information for debugging
}

export const debugIPInfo = (req: Request, _res: Response, next: NextFunction) => {
    // Middleware to debug IP detection
}
```

## 🛠️ Variables de Entorno

### Nuevas Variables Disponibles

```bash
# Habilitar debugging de IP información (solo para debugging)
DEBUG_IP_INFO=true

# Variables existentes que ahora funcionan correctamente
SECURE_BASE_URL=https://tu-dominio.com
NODE_ENV=production
```

### Configuración en GCP

En Google Cloud Run, asegúrate de que estas variables estén configuradas:

```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: SECURE_BASE_URL
    value: "https://tu-api.run.app"
  # Solo para debugging si es necesario
  - name: DEBUG_IP_INFO
    value: "false"
```

## 📊 Monitoreo y Debugging

### Para Habilitar Debugging de IP (Solo cuando sea necesario)

```bash
# En desarrollo
export DEBUG_IP_INFO=true

# En producción (temporalmente para debugging)
# Configura la variable de entorno en GCP Cloud Run
DEBUG_IP_INFO=true
```

### Información que se logea

Cuando `DEBUG_IP_INFO=true`:

```json
{
  "expressIP": "10.1.2.3",
  "xForwardedFor": "203.0.113.45, 10.1.2.3",
  "xRealIP": "203.0.113.45",
  "connectionRemoteAddress": "10.1.2.3",
  "xForwardedProto": "https",
  "userAgent": "Mozilla/5.0..."
}
```

## 🔒 Seguridad Mejorada

### Rate Limiting Inteligente

- **Usuarios Autenticados**: Limitados por User ID
- **Usuarios Anónimos**: Limitados por IP real
- **Detección de IP Robusta**: Múltiples fuentes de fallback
- **Logging Mejorado**: Mejor rastreo de violaciones

### Configuraciones de Proxy Trust

| Entorno | Configuración | Razón |
|---------|---------------|--------|
| Production | `trust proxy: 1` | Confía solo en el primer proxy (GCP) |
| Development | `trust proxy: true` | Confía en todos los proxies (flexibilidad local) |

## 🚀 Despliegue

### Versión Actual en Docker Hub

```bash
# Última versión con las correcciones
docker pull edieveg316/api-guidetypescript:v2.1.1

# O usar latest
docker pull edieveg316/api-guidetypescript:latest
```

### Comandos de Despliegue

```bash
# Build y push
docker build --target production -t edieveg316/api-guidetypescript:v2.1.1 .
docker push edieveg316/api-guidetypescript:v2.1.1

# Deploy en GCP Cloud Run
gcloud run deploy vegan-guide-api \
  --image edieveg316/api-guidetypescript:v2.1.1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,SECURE_BASE_URL=https://tu-api.run.app
```

## ✅ Verificación

### Cómo verificar que funciona

1. **Check Logs**: No más warnings sobre `req.ip`
2. **Rate Limiting**: Funciona correctamente por IP
3. **IP Detection**: `req.ip` devuelve la IP real del cliente
4. **Security**: Headers de proxy se interpretan correctamente

### Endpoints de Test

```bash
# Health check
curl https://tu-api.run.app/health

# Verificar que la API responde
curl https://tu-api.run.app/api/v1
```

## 🔍 Troubleshooting

### Si aún hay problemas

1. **Verificar Trust Proxy**:
   ```javascript
   console.log('Trust proxy setting:', app.get('trust proxy'));
   ```

2. **Habilitar Debug Temporal**:
   ```bash
   # En GCP Cloud Run
   DEBUG_IP_INFO=true
   ```

3. **Revisar Logs de GCP**:
   ```bash
   gcloud logs read --service=vegan-guide-api --limit=100
   ```

### Logs Esperados (Sin Errores)

✅ Sin warnings sobre `req.ip`  
✅ Rate limiting funcionando por IP  
✅ IPs reales en logs de seguridad  

---

## 📝 Notas Importantes

- Esta configuración es **esencial** para cualquier deployment detrás de un proxy (GCP, Heroku, AWS ELB, etc.)
- El debugging de IP debe usarse **solo temporalmente** en producción
- La configuración es diferente entre development y production por razones de seguridad
- Todas las funcionalidades de rate limiting ahora funcionan correctamente

## 🆕 Cambios en esta Versión (v2.1.1)

- ✅ Configuración de trust proxy para GCP
- ✅ Rate limiting mejorado con detección de IP robusta
- ✅ Utilidades de debugging de IP
- ✅ Logging mejorado para violaciones de rate limit
- ✅ Fallbacks múltiples para detección de IP
- ✅ Documentación completa de configuración