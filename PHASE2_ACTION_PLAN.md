# 🚀 VEGAN GUIDE - Plan de Acción Fase 2

## 📋 Estado Actual del Proyecto
- **Puntuación**: 9.2/10 
- **Fase 1**: ✅ Completada (Seguridad + Validación + Cache)
- **Progreso Total**: 55% completado

## 🎯 Objetivos de la Fase 2
1. Alcanzar 90% de cobertura de tests
2. Implementar CI/CD completo con quality gates
3. Optimizar queries de base de datos en 50%
4. Establecer monitoreo de performance

---

## 📌 Rama 1: feature/comprehensive-testing (5-6 días)

### **Objetivo**: Elevar cobertura de 52.68% → 90%

### **Día 1: Setup y Tests de Middleware**

```bash
# Crear rama
git checkout -b feature/comprehensive-testing

# Instalar dependencias de testing
npm install --save-dev supertest @types/supertest
npm install --save-dev mongodb-memory-server
npm install --save-dev @faker-js/faker
```

#### Tareas:
1. **Crear tests para middleware crítico** (7.38% → 80%)
   - `src/test/middleware/authMiddleware.test.ts` - Mejorar
   - `src/test/middleware/cache.test.ts` - Crear
   - `src/test/middleware/errorHandler.test.ts` - Crear
   - `src/test/middleware/security.test.ts` - Mejorar (arreglar HTTPS tests)

2. **Arreglar tests fallando**
   ```typescript
   // Arreglar callback undefined en authRoutes.ts línea 12
   router.post('/refresh-token', rateLimits.auth, validateInputLength(512), 
     validate({ body: userSchemas.refreshToken }), 
     refreshToken // Añadir este controller
   );
   ```

### **Día 2-3: Tests de Integración API**

#### Crear estructura:
```
src/test/integration/
├── auth.integration.test.ts
├── restaurants.integration.test.ts
├── businesses.integration.test.ts
├── geolocation.integration.test.ts
├── cache.integration.test.ts
└── helpers/
    ├── testDb.ts
    └── testFixtures.ts
```

#### Tests críticos a implementar:
```typescript
// src/test/integration/auth.integration.test.ts
describe('Authentication Flow Integration', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register user and return JWT token');
    it('should hash password correctly');
    it('should prevent duplicate emails');
    it('should validate email format');
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials');
    it('should return access and refresh tokens');
    it('should fail with invalid password');
    it('should handle rate limiting');
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh access token');
    it('should invalidate old refresh token');
    it('should handle blacklisted tokens');
  });
});
```

### **Día 4: Tests de Services y Config**

1. **Completar tests de services** (73.06% → 90%)
   - TokenService (13.88% → 90%)
   - GeoService (36.36% → 90%)
   - CacheWarmingService (necesita más edge cases)

2. **Añadir tests de configuración**
   ```typescript
   // src/test/config/db.test.ts
   describe('Database Configuration', () => {
     it('should connect to MongoDB successfully');
     it('should handle connection errors gracefully');
     it('should use correct database for environment');
   });
   ```

### **Día 5: Setup E2E con Playwright**

```bash
# Instalar Playwright
npm install --save-dev @playwright/test
npx playwright install

# Crear configuración
touch playwright.config.ts
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

#### Tests E2E críticos:
```
src/test/e2e/
├── auth.e2e.test.ts
├── search.e2e.test.ts
├── reviews.e2e.test.ts
└── api-health.e2e.test.ts
```

### **Día 6: Performance Tests y Coverage**

```bash
# Instalar Artillery para tests de carga
npm install --save-dev artillery
npm install --save-dev artillery-plugin-expect

# Crear archivo de configuración
touch artillery.yml
```

```yaml
# artillery.yml
config:
  target: "http://localhost:5001"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 50
  processor: "./performance-tests.js"

scenarios:
  - name: "API Health Check"
    flow:
      - get:
          url: "/api/v1/health"
          expect:
            - statusCode: 200
            - contentType: json
            
  - name: "Restaurant Search"
    flow:
      - get:
          url: "/api/v1/restaurants/nearby?lat=40.7128&lng=-74.0060"
          expect:
            - statusCode: 200
            - hasProperty: data
```

### **Criterios de Éxito**:
- ✅ Cobertura total ≥ 90%
- ✅ 0 tests fallando
- ✅ Todos los endpoints con tests de integración
- ✅ E2E tests para flujos críticos
- ✅ Performance baseline establecido

---

## 📌 Rama 2: feature/cicd-pipeline (2-3 días)

### **Día 1: Pre-commit Hooks y Linting**

```bash
# Instalar Husky y lint-staged
npm install --save-dev husky lint-staged
npx husky install

# Configurar hooks
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg "npx commitlint --edit $1"

# Instalar commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

```json
// package.json
"lint-staged": {
  "src/**/*.ts": [
    "eslint --fix",
    "prettier --write",
    "git add"
  ],
  "*.json": [
    "prettier --write"
  ]
}
```

### **Día 2: GitHub Actions Mejorado**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Security audit
        run: npm audit --audit-level=high
  
  test:
    runs-on: ubuntu-latest
    needs: quality
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### **Día 3: Deployment Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: |
          docker build -t vegan-api:${{ github.sha }} .
          docker tag vegan-api:${{ github.sha }} vegan-api:staging
      
      - name: Deploy to staging
        run: |
          # Add your deployment script here
          echo "Deploying to staging..."
```

### **Criterios de Éxito**:
- ✅ Pre-commit hooks funcionando
- ✅ CI pipeline < 5 minutos
- ✅ Quality gates automáticos
- ✅ Coverage reports en cada PR
- ✅ Deployment automático a staging

---

## 📌 Rama 3: feature/database-optimization (3-4 días)

### **Día 1: Análisis y Profiling**

```bash
# Conectar a MongoDB y activar profiling
mongosh

use vegan-guide
db.setProfilingLevel(2, { slowms: 100 })

# Ver queries lentas
db.system.profile.find({ millis: { $gt: 100 } }).limit(10)
```

### **Día 2: Implementar Índices Compuestos**

```typescript
// src/scripts/createIndexes.ts
import mongoose from 'mongoose';

async function createIndexes() {
  // Índices para búsquedas comunes
  await Restaurant.collection.createIndex({ 
    'location': '2dsphere', 
    'rating': -1 
  });
  
  // Índices de texto para búsquedas
  await Restaurant.collection.createIndex({ 
    'restaurantName': 'text', 
    'cuisine': 'text' 
  });
  
  // Índices compuestos para filtros
  await Restaurant.collection.createIndex({ 
    'typePlace': 1, 
    'budget': 1, 
    'rating': -1 
  });
  
  // Índices para paginación
  await Restaurant.collection.createIndex({ 
    'createdAt': -1, 
    '_id': 1 
  });
}
```

### **Día 3: Connection Pooling y Optimización**

```typescript
// src/config/db.ts - Mejorar configuración
const mongoOptions: ConnectOptions = {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  readPreference: 'primaryPreferred',
  readConcern: { level: 'majority' }
};
```

### **Día 4: Query Optimization**

```typescript
// src/services/optimizedQueries.ts
export class OptimizedQueryService {
  // Usar agregación para queries complejas
  async getNearbyRestaurantsOptimized(lat: number, lng: number, radius: number) {
    return Restaurant.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
          query: { isActive: true }
        }
      },
      {
        $match: {
          rating: { $gte: 3.5 }
        }
      },
      {
        $project: {
          restaurantName: 1,
          address: 1,
          rating: 1,
          distance: 1,
          image: 1
        }
      },
      {
        $limit: 20
      }
    ]).allowDiskUse(true);
  }
}
```

### **Criterios de Éxito**:
- ✅ Queries 50% más rápidas
- ✅ Índices optimizados creados
- ✅ Connection pool configurado
- ✅ Agregaciones optimizadas
- ✅ Monitoring de performance activo

---

## 📌 Rama 4: feature/performance-monitoring (3-4 días)

### **Día 1: Setup Prometheus y Grafana**

```bash
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### **Día 2: Instrumentación de Métricas**

```typescript
// src/middleware/metrics.ts
import client from 'prom-client';

const register = new client.Registry();

// Métricas HTTP
const httpDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

// Métricas de negocio
const restaurantSearches = new client.Counter({
  name: 'restaurant_searches_total',
  help: 'Total number of restaurant searches',
  labelNames: ['search_type', 'has_results']
});

register.registerMetric(httpDuration);
register.registerMetric(restaurantSearches);

export { register, httpDuration, restaurantSearches };
```

### **Día 3-4: Health Checks y Alertas**

```typescript
// src/routes/health.ts
router.get('/health/detailed', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemory(),
      diskSpace: await checkDiskSpace()
    }
  };
  
  const isHealthy = Object.values(healthCheck.checks)
    .every(check => check.status === 'healthy');
  
  res.status(isHealthy ? 200 : 503).json(healthCheck);
});
```

### **Criterios de Éxito**:
- ✅ Métricas expuestas en /metrics
- ✅ Dashboards de Grafana configurados
- ✅ Alertas configuradas
- ✅ Health checks completos
- ✅ 99.9% uptime visibility

---

## 📊 Métricas de Éxito Globales Fase 2

| Métrica | Actual | Objetivo | Prioridad |
|---------|--------|----------|-----------|
| Test Coverage | 52.68% | 90% | 🔴 Critical |
| CI/CD Pipeline | Básico | Completo | 🔴 Critical |
| Query Performance | Baseline | +50% mejora | 🟡 High |
| Monitoring | Ninguno | Full observability | 🟡 High |
| Build Time | Unknown | < 5 min | 🟡 High |
| Deploy Time | Manual | < 10 min auto | 🟡 High |

## 🗓️ Timeline Total Fase 2

- **Semana 1**: Testing (5-6 días)
- **Semana 2**: CI/CD (2-3 días) + Database (3-4 días)
- **Semana 3**: Monitoring (3-4 días) + Buffer

**Duración Total**: 2.5-3 semanas

## ⚡ Comandos Rápidos de Inicio

```bash
# Iniciar Fase 2
git checkout development
git pull origin development
git checkout -b feature/comprehensive-testing

# Verificar estado actual
npm run test:ci
npm audit
npm run lint

# Instalar todas las dependencias necesarias
npm install --save-dev \
  supertest @types/supertest \
  mongodb-memory-server \
  @faker-js/faker \
  @playwright/test \
  artillery artillery-plugin-expect \
  husky lint-staged \
  @commitlint/cli @commitlint/config-conventional

# Comenzar con el primer test
npm run test:watch
```

## 🎯 Resultado Esperado al Final de Fase 2

- **Puntuación del Proyecto**: 9.5/10
- **Confianza en el Código**: 100%
- **Velocidad de Desarrollo**: +50%
- **Tiempo de Detección de Bugs**: -80%
- **Deployment Confidence**: 100% automated