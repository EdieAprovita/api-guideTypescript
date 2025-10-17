# 🔧 Cloud Run Deployment - Quick Fix Guide

## ✅ Cambios Aplicados

He corregido **4 problemas críticos** que impedían el deployment en Cloud Run:

### 1. **Puerto Incorrecto** 🔌

```typescript
// ❌ ANTES
const PORT = process.env.PORT ?? 5001;

// ✅ AHORA
const PORT = process.env.PORT ?? 8080;
```

### 2. **Interfaz de Red** 🌐

```typescript
// ❌ ANTES: Solo localhost
app.listen(PORT, () => {...});

// ✅ AHORA: 0.0.0.0 en producción
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(Number(PORT), HOST, () => {...});
```

### 3. **Conexión MongoDB No Bloqueante** 🔄

```typescript
// ❌ ANTES: Bloqueaba el inicio
connectDB();

// ✅ AHORA: Asíncrono
connectDB().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    // Server continues to run
});
```

### 4. **Timeouts del Health Check** ⏱️

```dockerfile
# ❌ ANTES
HEALTHCHECK --start-period=15s

# ✅ AHORA
HEALTHCHECK --interval=30s --timeout=15s --start-period=40s --retries=3
```

## 🧪 Probar Localmente (Recomendado)

Antes de hacer push, prueba los cambios localmente:

```bash
# Ejecutar el script de prueba
./scripts/test-cloud-run-local.sh
```

Este script:

- ✅ Construye la imagen Docker
- ✅ Simula el entorno de Cloud Run
- ✅ Verifica que el servidor inicie correctamente
- ✅ Prueba los health checks
- ✅ Muestra logs y estadísticas

**Tiempo esperado**: 30-60 segundos

## 🚀 Deploy a Cloud Run

Una vez que las pruebas locales pasen:

```bash
# 1. Commit los cambios
git add .
git commit -m "fix: Cloud Run deployment - correct port binding and non-blocking DB connection

- Changed default port from 5001 to 8080
- Server now listens on 0.0.0.0 in production
- MongoDB connection is non-blocking
- Increased health check timeouts for cold starts
- Updated healthcheck.js for better Cloud Run compatibility"

# 2. Push para activar Cloud Build
git push origin development

# 3. Monitorear el deployment
# Ir a: https://console.cloud.google.com/cloud-build
```

## 📋 Archivos Modificados

- ✅ `src/server.ts` - Puerto y host corregidos
- ✅ `src/app.ts` - Conexión DB no bloqueante
- ✅ `Dockerfile` - Timeouts aumentados
- ✅ `healthcheck.js` - Mejor logging y timeouts
- ✅ `package.json` - Script docker:run actualizado
- 📄 `docs/cloud-run-fixes.md` - Documentación detallada
- 🧪 `scripts/test-cloud-run-local.sh` - Script de prueba

## ⚠️ Variables de Entorno en Cloud Run

Asegúrate de tener estas variables configuradas:

```bash
# Cloud Run las establece automáticamente:
PORT=8080
NODE_ENV=production

# TÚ debes configurar:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Opcional:
ENABLE_SWAGGER_UI=false  # Por seguridad en producción
```

### Cómo configurar variables en Cloud Run:

```bash
gcloud run services update api-guidetypescript \
    --set-env-vars="MONGODB_URI=your-mongodb-uri" \
    --region=europe-west1
```

O en la consola web:

1. Ve a Cloud Run → tu servicio
2. Edit & Deploy New Revision
3. Variables & Secrets → Add Variable
4. Añade `MONGODB_URI`

## 🐛 Troubleshooting

### Si el deployment aún falla:

#### 1. **Revisar logs de Cloud Run**

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api-guidetypescript" \
    --limit=50 \
    --format=json
```

#### 2. **MongoDB Connection Issues**

- Verifica que MongoDB Atlas permita conexiones desde `0.0.0.0/0`
- O configura VPC peering
- Revisa las credenciales en `MONGODB_URI`

#### 3. **Timeout en Cold Start**

Si el container tarda > 40 segundos:

```dockerfile
# En Dockerfile, aumenta start-period:
HEALTHCHECK --start-period=60s
```

#### 4. **Verificar localmente con las mismas condiciones**

```bash
# Probar con tu MONGODB_URI real
docker run -p 8080:8080 \
    -e PORT=8080 \
    -e NODE_ENV=production \
    -e MONGODB_URI="tu-mongodb-uri-real" \
    api-guidetypescript-test

# Luego:
curl http://localhost:8080/health
```

## 📊 Resultados Esperados

### En Cloud Build Console:

```
✅ Step #0 - Build: SUCCESS
✅ Step #1 - Push: SUCCESS
✅ Step #2 - Deploy: SUCCESS (antes fallaba aquí)
```

### En Cloud Run Logs:

```
🚀 Server running in production mode on 0.0.0.0:8080
📚 API Documentation available at: http://localhost:8080/api-docs
MongoDB Connected: cluster.mongodb.net:27017/dbname
```

## 🎯 Checklist Final

Antes de hacer push:

- [ ] Ejecutar `./scripts/test-cloud-run-local.sh`
- [ ] Verificar que el test pase en < 60 segundos
- [ ] Confirmar que `/health` responde con 200
- [ ] Verificar que `MONGODB_URI` esté configurado en Cloud Run
- [ ] Hacer commit de los cambios
- [ ] Push a `development`
- [ ] Monitorear Cloud Build

## 📚 Documentación Adicional

- [Guía detallada](./cloud-run-fixes.md) - Explicación técnica completa
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/tips/nodejs)
- [Container Contract](https://cloud.google.com/run/docs/container-contract)

## ❓ Preguntas Frecuentes

**Q: ¿Por qué MongoDB puede fallar al conectar pero el servidor sigue funcionando?**  
A: Ahora la conexión es no bloqueante. El servidor puede arrancar y servir health checks mientras MongoDB se conecta en segundo plano.

**Q: ¿Necesito cambiar algo en mi código existente?**  
A: No. Los cambios son solo en la configuración de inicio y deployment. Tu lógica de negocio permanece igual.

**Q: ¿Qué pasa si mi cold start es muy lento?**  
A: Puedes aumentar el `start-period` en el Dockerfile o considerar Cloud Run minimum instances.

---

**¿Necesitas ayuda?** Revisa los logs en la consola de GCP o ejecuta el script de prueba local para más detalles.
