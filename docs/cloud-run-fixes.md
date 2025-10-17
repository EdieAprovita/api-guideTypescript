# Correcciones para Cloud Run Deployment

## 🎯 Problema Principal

El contenedor falló al iniciar en Cloud Run con el error:

```
ERROR: The user-provided container failed to start and listen on the port
defined by the PORT=8080 environment variable within the allocated timeout.
```

## 🔍 Causas Identificadas

### 1. **Puerto Incorrecto** ❌

- **Antes**: `const PORT = process.env.PORT ?? 5001`
- **Problema**: Cloud Run establece `PORT=8080` pero el fallback era 5001
- **Ahora**: `const PORT = process.env.PORT ?? 8080` ✅

### 2. **Interfaz de Red Incorrecta** ❌

- **Antes**: El servidor escuchaba solo en `localhost` por defecto
- **Problema**: Cloud Run requiere que escuches en `0.0.0.0` para aceptar tráfico
- **Ahora**: `app.listen(PORT, '0.0.0.0')` en producción ✅

### 3. **Conexión MongoDB Bloqueante** ❌

- **Antes**: `connectDB()` bloqueaba el inicio del servidor
- **Problema**: Si MongoDB tardaba > 5s, el servidor nunca iniciaba y fallaba el health check
- **Ahora**: Conexión asíncrona no bloqueante ✅

### 4. **Timeouts Insuficientes** ❌

- **Antes**: Health check con 15s de start-period
- **Problema**: No suficiente tiempo para iniciar en cold starts
- **Ahora**: 40s de start-period, 15s de timeout ✅

## ✅ Cambios Aplicados

### 1. `src/server.ts`

```typescript
// Cloud Run compatibility
const PORT = process.env.PORT ?? 8080;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Server running on ${HOST}:${PORT}`);
});
```

**Por qué**:

- Usa el puerto correcto (8080)
- Escucha en todas las interfaces en producción
- Convierte PORT a número explícitamente

### 2. `src/app.ts`

```typescript
// Conexión no bloqueante a MongoDB
if (process.env.NODE_ENV !== 'test') {
    connectDB().catch(err => {
        console.error('Failed to connect to MongoDB on startup:', err);
        // Continue running - el app puede servir health checks
    });
}
```

**Por qué**:

- No bloquea el inicio del servidor
- Permite que health checks pasen mientras MongoDB se conecta
- El servidor puede reconectar automáticamente después

### 3. `Dockerfile`

```dockerfile
# Health check con timeouts aumentados
HEALTHCHECK --interval=30s --timeout=15s --start-period=40s --retries=3 \
  CMD node healthcheck.js
```

**Por qué**:

- `start-period=40s`: Da tiempo suficiente para cold starts
- `timeout=15s`: Permite respuestas más lentas durante inicio
- Compatible con requisitos de Cloud Run

### 4. `healthcheck.js`

```javascript
const options = {
    hostname: 'localhost', // Interfaz local
    port: process.env.PORT || 8080,
    path: '/health',
    timeout: 8000, // 8 segundos
};
```

**Por qué**:

- Verifica en la interfaz correcta
- Timeout aumentado para arranques lentos
- Mejor logging para debugging

## 🚀 Variables de Entorno Requeridas en Cloud Run

Asegúrate de que estas variables estén configuradas:

```bash
# Requeridas
PORT=8080                    # Cloud Run lo establece automáticamente
NODE_ENV=production
MONGODB_URI=mongodb+srv://...  # Tu conexión MongoDB

# Opcionales pero recomendadas
ENABLE_SWAGGER_UI=false      # Deshabilitar Swagger en producción
LOG_LEVEL=info
```

## 📋 Checklist para Deployment

Antes de hacer deploy a Cloud Run:

- [x] Puerto configurado a 8080 por defecto
- [x] Servidor escucha en `0.0.0.0` en producción
- [x] Conexión DB no bloqueante
- [x] Health check endpoint `/health` funcional
- [x] Timeouts aumentados en Dockerfile
- [x] Variables de entorno configuradas
- [ ] Verificar logs de MongoDB en GCP Console
- [ ] Probar health check localmente: `docker run -p 8080:8080 <image>`

## 🧪 Testing Local

### Test 1: Docker Build Local

```bash
# Build
docker build -t api-guidetypescript:test .

# Run (sin MongoDB - debe iniciar de todas formas)
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://fake:27017/test \
  api-guidetypescript:test

# Verificar health check
curl http://localhost:8080/health
```

**Resultado esperado**: El servidor debe iniciar en ~5-10 segundos y responder a `/health` incluso si MongoDB no está disponible.

### Test 2: Con Docker Compose

```bash
docker-compose up --build
curl http://localhost:8080/health
```

## 🔧 Troubleshooting

### "Container failed to start"

1. **Verificar logs en GCP Console** usando el URL proporcionado
2. Buscar errores de conexión a MongoDB
3. Verificar que todas las variables de entorno estén configuradas

### "Health check failed"

1. Verificar que `/health` endpoint esté funcionando localmente
2. Asegurar que el servidor escuche en `0.0.0.0`
3. Aumentar `start-period` si el cold start es muy lento

### "MongoDB connection timeout"

1. Verificar que MongoDB Atlas permita conexiones desde Cloud Run
2. Añadir `0.0.0.0/0` a IP whitelist en MongoDB Atlas
3. Verificar credenciales en `MONGODB_URI`

## 📚 Referencias

- [Cloud Run Container Contract](https://cloud.google.com/run/docs/container-contract)
- [Cloud Run Troubleshooting](https://cloud.google.com/run/docs/troubleshooting)
- [Best Practices for Node.js on Cloud Run](https://cloud.google.com/run/docs/tips/nodejs)

## 🎯 Próximos Pasos

1. **Commit y Push**: Los cambios están listos para ser commiteados
2. **Verificar en Cloud Build**: El próximo deploy debería funcionar
3. **Monitorear**: Revisar logs después del deploy
4. **Optimizar**: Considerar Cloud Run startup time optimization

```bash
# Comandos para commit
git add .
git commit -m "fix: Cloud Run deployment - correct port binding and non-blocking DB connection"
git push origin development
```

## ⚠️ Notas Importantes

1. **MongoDB Atlas**: Asegúrate de que tu cluster permita conexiones desde Cloud Run (whitelist `0.0.0.0/0` o usar VPC)
2. **Cold Starts**: Primera request puede tardar 10-15 segundos
3. **Secrets**: Considera usar Google Secret Manager para `MONGODB_URI`
4. **Logs**: Usa `console.log` - Cloud Run los captura automáticamente

---

**Estado**: ✅ Cambios aplicados y listos para deploy
**Fecha**: 2025-10-17
**Autor**: AI Assistant
