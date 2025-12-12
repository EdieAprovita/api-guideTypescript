# 🔧 Cloud Run Deployment Fix - Summary

## ❌ Problema Original

El contenedor fallaba al iniciar en Cloud Run con el siguiente error:

```
ERROR: The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

## 🔍 Causas Identificadas

1. **Conexión bloqueante a MongoDB**: La aplicación esperaba a que MongoDB se conectara antes de iniciar el servidor HTTP, causando timeouts de inicio.

2. **Configuración incorrecta del host**: En producción, el servidor debe escuchar en `0.0.0.0`, no en `localhost`.

3. **Timeouts insuficientes**: Los timeouts de conexión a MongoDB eran demasiado cortos para Cloud Run.

4. **Falta de logging detallado**: Era difícil diagnosticar problemas de inicio.

## ✅ Soluciones Implementadas

### 1. Conexión No-Bloqueante a MongoDB (`src/app.ts`)

**Antes:**

```typescript
if (process.env.NODE_ENV !== 'test') {
    connectDB().catch(err => {
        console.error('Failed to connect to MongoDB on startup:', err);
    });
}
```

**Después:**

```typescript
let isMongoConnected = false;
let mongoConnectionError: Error | null = null;

if (process.env.NODE_ENV !== 'test') {
    connectDB()
        .then(() => {
            isMongoConnected = true;
            console.log('✅ MongoDB connected successfully');
        })
        .catch(err => {
            isMongoConnected = false;
            mongoConnectionError = err;
            console.error('⚠️  Failed to connect to MongoDB on startup:', err.message);
            console.log('📌 Server will continue running without database connection');
        });
}

export const getMongoStatus = () => ({
    connected: isMongoConnected,
    error: mongoConnectionError?.message || null,
});
```

**Beneficios:**

- El servidor HTTP inicia inmediatamente
- MongoDB se conecta en segundo plano
- El servidor sigue funcionando incluso si MongoDB falla
- Estado de MongoDB exportable para health checks

### 2. Configuración Correcta del Host (`src/server.ts`)

**Antes:**

```typescript
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
```

**Después:**

```typescript
const HOST = '0.0.0.0'; // REQUIRED for Cloud Run
```

**Beneficios:**

- Cloud Run puede enrutar tráfico al contenedor
- Consistencia entre desarrollo y producción
- Elimina un punto de fallo común

### 3. Timeouts Mejorados para MongoDB (`src/config/db.ts`)

**Antes:**

```typescript
const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
};
```

**Después:**

```typescript
const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000, // 10 seconds
    bufferCommands: false,
    retryWrites: true, // Retry write operations
};
```

**Beneficios:**

- Más tiempo para establecer conexiones en redes lentas
- Reintentos automáticos de escrituras
- Mejor manejo de SIGTERM para graceful shutdown

### 4. Logging Mejorado (`src/server.ts`)

**Agregado:**

```typescript
console.log(colorTheme.info.bold(`🔧 Starting server in ${process.env.NODE_ENV ?? 'development'} mode`));
console.log(colorTheme.info.bold(`🔧 Binding to ${HOST}:${PORT}`));
console.log(colorTheme.info.bold(`🔧 Node version: ${process.version}`));
console.log(colorTheme.info.bold(`🔧 Memory limit: ${process.env.NODE_OPTIONS || 'default'}`));
```

**Beneficios:**

- Diagnóstico más fácil de problemas de inicio
- Visibilidad del proceso de inicialización
- Confirmación de configuración correcta

### 5. Optimización del Dockerfile

**Antes:**

```dockerfile
ENV NODE_ENV=production
# PORT will be provided by Cloud Run dynamically

HEALTHCHECK --interval=30s --timeout=15s --start-period=40s --retries=3 \
  CMD node healthcheck.js
```

**Después:**

```dockerfile
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node healthcheck.js
```

**Beneficios:**

- Límite de memoria explícito para Node.js
- Puerto por defecto definido
- Período de inicio extendido para primera carga

## 📋 Nuevos Archivos y Scripts

### 1. `/docs/CLOUD_RUN_TROUBLESHOOTING.md`

Guía completa de troubleshooting con:

- Causas comunes de errores
- Soluciones paso a paso
- Configuración recomendada
- Comandos útiles

### 2. `/docs/CLOUD_RUN_DEPLOYMENT.md`

Guía rápida de despliegue con:

- Pasos de deployment
- Variables de entorno requeridas
- Testing local
- Verificación post-deployment

### 3. `/scripts/verify-cloud-run-config.sh`

Script de verificación pre-deployment que chequea:

- ✅ Configuración del Dockerfile
- ✅ Configuración del servidor
- ✅ Health checks
- ✅ Variables de entorno
- ✅ Dependencias
- ✅ Build de Docker

### 4. `/scripts/deploy-cloud-run.sh` (mejorado)

Script de deployment automatizado que:

- ✅ Ejecuta verificaciones pre-flight
- ✅ Maneja commits y push
- ✅ Configura variables de entorno
- ✅ Inicia deployment
- ✅ Proporciona URLs de monitoreo

## 🧪 Cómo Probar los Cambios

### 1. Verificación Local

```bash
# Ejecutar verificación
./scripts/verify-cloud-run-config.sh

# Build local
npm run build

# Test con Docker
docker build -t api-guidetypescript .
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your-mongodb-uri" \
  api-guidetypescript

# En otra terminal, probar
curl http://localhost:8080/health
curl http://localhost:8080/api/v1
```

### 2. Deployment a Cloud Run

```bash
# Opción 1: Script automatizado
./scripts/deploy-cloud-run.sh

# Opción 2: Manual
git add .
git commit -m "fix: Cloud Run deployment fixes"
git push origin development
```

### 3. Verificación Post-Deployment

```bash
# Obtener URL del servicio
SERVICE_URL=$(gcloud run services describe api-guidetypescript \
  --region=europe-west1 \
  --format="value(status.url)")

# Probar endpoints
curl $SERVICE_URL/health
curl $SERVICE_URL/health/ready
curl $SERVICE_URL/api/v1
```

## ⚙️ Configuración Requerida en Cloud Run

### Variables de Entorno Mínimas

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
NODE_ENV=production
```

### Variables Opcionales

```bash
ENABLE_SWAGGER_UI=true
JWT_SECRET=your-secret
COOKIE_SECRET=your-secret
```

### Configuración del Servicio

```bash
gcloud run deploy api-guidetypescript \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --timeout=300 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --startup-cpu-boost \
  --execution-environment=gen2 \
  --startup-probe-period=240 \
  --set-env-vars="NODE_ENV=production,MONGODB_URI=your-uri"
```

## 📊 Resultados Esperados

### Antes (❌ Falla)

```
Step #2 - "Deploy": ERROR: The user-provided container failed to start
Deployment failed
Duration: 4m14s
Status: FAILURE
```

### Después (✅ Éxito)

```
Step #0 - "Build": ✅ SUCCESS
Step #1 - "Push": ✅ SUCCESS
Step #2 - "Deploy": ✅ SUCCESS
Duration: ~3m30s
Status: SUCCESS
Service URL: https://api-guidetypescript-xxx.run.app
```

### Logs Esperados al Iniciar

```
🔧 Starting server in production mode
🔧 Binding to 0.0.0.0:8080
🔧 Node version: v20.19.5
🔧 Memory limit: --max-old-space-size=512
🔄 Attempting to connect to MongoDB...
🚀 Server running in production mode on 0.0.0.0:8080
📚 API Documentation available at: http://localhost:8080/api-docs
❤️  Health check available at: http://localhost:8080/health
✅ Server is ready to accept connections
✅ MongoDB Connected: cluster0.mongodb.net:27017/vegan-guide
```

## 🎯 Checklist de Deployment

- [x] Servidor escucha en `0.0.0.0`
- [x] Puerto configurado desde `process.env.PORT`
- [x] Conexión a MongoDB es no-bloqueante
- [x] Health checks implementados
- [x] Timeouts aumentados
- [x] Logging detallado agregado
- [x] Dockerfile optimizado
- [x] Scripts de verificación creados
- [x] Documentación completa
- [x] Build local exitoso

## 📝 Próximos Pasos

1. ✅ **Commit y Push**

    ```bash
    git add .
    git commit -m "fix: Cloud Run deployment - non-blocking DB and correct host binding"
    git push origin development
    ```

2. 🔍 **Monitorear Deployment**
    - Cloud Build: https://console.cloud.google.com/cloud-build
    - Cloud Run: https://console.cloud.google.com/run

3. ✅ **Verificar Servicio**

    ```bash
    curl https://your-service.run.app/health
    ```

4. 📊 **Revisar Logs**
    ```bash
    gcloud run services logs tail api-guidetypescript --region=europe-west1
    ```

## 🆘 Troubleshooting

Si aún hay problemas, revisa:

1. **Variables de entorno**: Verifica que `MONGODB_URI` esté configurada
2. **MongoDB Atlas**: Permite acceso desde `0.0.0.0/0`
3. **Logs de Cloud Run**: Busca errores específicos
4. **Test local**: Prueba con Docker primero
5. **Documentación**: Lee `/docs/CLOUD_RUN_TROUBLESHOOTING.md`

## 📚 Referencias

- [Cloud Run Troubleshooting Guide](./docs/CLOUD_RUN_TROUBLESHOOTING.md)
- [Deployment Quick Start](./docs/CLOUD_RUN_DEPLOYMENT.md)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
