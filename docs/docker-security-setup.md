# 🔐 Docker Security Setup Guide

Esta guía te ayudará a configurar Docker de forma segura para tu API Vegan Guide.

## 🚨 **CRÍTICO: Configuración de Credenciales Seguras**

### Paso 1: Crear archivo de credenciales

```bash
# Copiar el template de ejemplo
cp .env.docker.example .env.docker
```

### Paso 2: Generar contraseñas seguras

```bash
# Para contraseñas de MongoDB y Redis
openssl rand -base64 32

# Para secretos JWT (más largos y seguros)
openssl rand -hex 64
```

### Paso 3: Editar .env.docker con credenciales reales

```bash
# Editar el archivo con credenciales seguras
nano .env.docker
# o
code .env.docker
```

**Ejemplo de configuración segura:**

```env
# MongoDB - ¡Cambiar siempre!
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0
MONGO_DATABASE=vegan-city-guide

# Redis - ¡Cambiar siempre!
REDIS_PASSWORD=X9y8Z7a6B5c4D3e2F1g0H9i8J7k6L5m4N3o2P1q0

# JWT Secrets - ¡Usar secretos largos y únicos!
JWT_SECRET=ea123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01
JWT_REFRESH_SECRET=fb234567890bcdef1234567890bcdef1234567890bcdef1234567890bcdef012

# Development (diferentes de producción)
JWT_SECRET_DEV=gc345678901cdef2345678901cdef2345678901cdef2345678901cdef23456789
JWT_REFRESH_SECRET_DEV=hd456789012def3456789012def3456789012def3456789012def345678901
```

## 🚀 Uso de Docker Compose

### Producción
```bash
# Construcción y ejecución en modo producción
docker-compose --profile prod up --build -d

# Ver logs
docker-compose --profile prod logs -f api

# Parar servicios
docker-compose --profile prod down
```

### Desarrollo
```bash
# Construcción y ejecución en modo desarrollo
docker-compose --profile dev up --build

# Con hot reload habilitado
docker-compose --profile dev up
```

## ✅ Verificación de Seguridad

### 1. Verificar que .env.docker no está en Git

```bash
# Este comando no debe mostrar .env.docker
git status

# Si aparece .env.docker, añádelo a .gitignore inmediatamente
echo ".env.docker" >> .gitignore
```

### 2. Verificar contraseñas únicas

```bash
# Verificar que no usas contraseñas por defecto
grep -i "password123\|your_secure\|changeme" .env.docker
# Este comando NO debe devolver resultados
```

### 3. Test de conectividad

```bash
# Verificar que los servicios están corriendo
docker-compose --profile prod ps

# Test de salud de la API
curl http://localhost:5001/health

# Test de Swagger (si está habilitado)
curl http://localhost:5001/api-docs
```

## 🛡️ Mejores Prácticas de Seguridad

### ✅ **SÍ hacer:**

- ✅ Usar contraseñas generadas aleatoriamente
- ✅ Diferentes credenciales para dev/prod
- ✅ Rotar credenciales regularmente
- ✅ Usar HTTPS en producción
- ✅ Mantener .env.docker fuera de Git
- ✅ Usar secretos diferentes por entorno
- ✅ Monitorear logs por actividad sospechosa

### ❌ **NO hacer:**

- ❌ Nunca commitear archivos .env.docker
- ❌ No usar contraseñas simples o por defecto
- ❌ No compartir credenciales por email/chat
- ❌ No usar las mismas credenciales en prod/dev
- ❌ No hardcodear secretos en el código
- ❌ No usar HTTP en producción
- ❌ No ignorar los logs de seguridad

## 🔍 Troubleshooting de Seguridad

### Problema: "Access denied" al conectar a MongoDB
```bash
# Verificar credenciales en .env.docker
grep MONGO_ .env.docker

# Verificar logs de MongoDB
docker-compose --profile prod logs mongodb
```

### Problema: "Redis authentication failed"
```bash
# Verificar contraseña de Redis
grep REDIS_PASSWORD .env.docker

# Test de conexión a Redis
docker exec -it vegan-city-guide-redis redis-cli -a your_redis_password ping
```

### Problema: JWT no válido
```bash
# Verificar que los JWT secrets son suficientemente largos
grep JWT_SECRET .env.docker | wc -c
# Debe ser > 50 caracteres
```

## 🌍 Configuración para Diferentes Entornos

### Local Development
```bash
cp .env.docker.example .env.docker.dev
# Usar contraseñas simples para desarrollo local
```

### Staging/Production
```bash
cp .env.docker.example .env.docker.prod
# Usar contraseñas seguras generadas aleatoriamente
```

### CI/CD Pipeline
```bash
# Usar variables de entorno del CI/CD
# No almacenar .env.docker en el repositorio
```

## 📚 Recursos Adicionales

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Redis Security](https://redis.io/topics/security)

## 🆘 En Caso de Compromiso de Credenciales

1. **Inmediatamente cambiar todas las contraseñas**
2. **Rotar todos los JWT secrets**
3. **Revisar logs de acceso** 
4. **Verificar integridad de datos**
5. **Notificar al equipo**
6. **Actualizar procedimientos de seguridad**

---

## ⚠️ Recordatorio Final

**🚨 LA SEGURIDAD ES RESPONSABILIDAD DE TODOS**

- Siempre usar contraseñas únicas y seguras
- Nunca commitear credenciales al repositorio
- Rotar credenciales regularmente
- Monitorear por actividad sospechosa
- Mantener dependencias actualizadas

---

*Última actualización: $(date)*