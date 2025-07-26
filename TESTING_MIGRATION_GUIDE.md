# 🧪 Testing Framework Migration Guide

## 📖 Resumen de Cambios

Este documento describe la migración del framework de testing complejo y fragmentado a un sistema unificado, simple y robusto.

### ✅ Problemas Resueltos

- **Configuraciones duplicadas**: Eliminadas múltiples configuraciones conflictivas
- **Mocks inconsistentes**: TokenService y JWT mocks unificados
- **Complejidad innecesaria**: Framework simplificado pero potente
- **Falta de estándares**: Patrones consistentes establecidos
- **Coverage fragmentado**: Métricas unificadas y optimizadas

## 🏗️ Nueva Arquitectura

```
src/test/
├── config/
│   └── unified-test-config.ts        # ✨ Configuración única
├── utils/
│   └── unified-test-helpers.ts       # ✨ Helpers unificados
├── setup/
│   └── global-setup.ts              # ✨ Setup simplificado
├── controllers/                     # Tests de controladores
├── services/                        # Tests de servicios
├── middleware/                      # Tests de middleware
├── integration/                     # Tests de integración
└── e2e/                            # Tests E2E (Playwright)
```

## 🚀 Cómo Migrar Tests Existentes

### 1. **Migración de Tests de Controladores**

#### ❌ Antes (Complejo)

```typescript
// Múltiples imports, configuraciones duplicadas
import { describe, it, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { createMockRequest, createMockResponse } from '../utils/testHelpers';
import { generateTestUser } from '../utils/mockGenerators';
// ... más imports

// Configuración manual de mocks
const mockBusinessService = {
    getAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    // ... más métodos
};

vi.mock('../../services/BusinessService', () => ({
    businessService: mockBusinessService,
}));

// Tests repetitivos
describe('Business Controllers', () => {
    it('should get all businesses', async () => {
        const mockData = [
            /* datos mock */
        ];
        mockBusinessService.getAll.mockResolvedValue(mockData);

        const response = await request(app)
            .get('/api/v1/businesses')
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // ... más assertions
    });

    // Repetir para cada endpoint CRUD...
});
```

#### ✅ Después (Simplificado)

```typescript
import { describe, it, beforeEach, vi } from 'vitest';
import app from '../../app';
import { generateTestData, createServiceMock, generateCrudTests, resetAllMocks } from '../utils/unified-test-helpers';

// Mock automático y simple
const mockBusinessService = createServiceMock([
    generateTestData.business({ namePlace: 'Test Business 1' }),
    generateTestData.business({ namePlace: 'Test Business 2' }),
]);

vi.mock('../../services/BusinessService', () => ({
    businessService: mockBusinessService,
}));

describe('Business Controllers', () => {
    beforeEach(() => resetAllMocks());

    // ✨ Tests CRUD auto-generados
    const crudTests = generateCrudTests({
        app,
        basePath: '/api/v1/businesses',
        serviceMock: mockBusinessService,
        validData: generateTestData.business(),
        updateData: { namePlace: 'Updated Business' },
        resourceName: 'business',
    });

    crudTests.runAllTests(); // ✨ 5 tests en 1 línea!

    // Solo tests específicos del negocio
    describe('Business-specific logic', () => {
        // ... tests específicos
    });
});
```

### 2. **Migración de Tests de Servicios**

#### ❌ Antes

```typescript
// Configuración manual compleja
const mockModel = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    // ...
};

vi.mock('../../models/Business', () => ({ Business: mockModel }));
```

#### ✅ Después

```typescript
import { generateTestData, createServiceMock } from '../utils/unified-test-helpers';

const mockData = [generateTestData.business()];
const service = new BusinessService();

// Tests automáticos para métodos base
// + tests específicos del servicio
```

### 3. **Migración de Tests de Integración**

#### ❌ Antes

```typescript
// Configuración compleja de DB
beforeAll(async () => {
    if (!process.env.MONGODB_URI?.includes('localhost')) {
        mongoServer = await MongoMemoryServer.create({
            // configuración compleja...
        });
        // más configuración...
    }
});
```

#### ✅ Después

```typescript
import { configureTest } from '../config/unified-test-config';

// ✨ Configuración automática
const testHooks = configureTest({ type: 'integration' });

describe('Business Integration Tests', () => {
    beforeAll(testHooks.beforeAll);
    afterAll(testHooks.afterAll);
    beforeEach(testHooks.beforeEach);

    // Tests limpios y simples
});
```

## 🎯 Nuevas Mejores Prácticas

### 1. **Estructura de Tests**

```typescript
describe('EntityName', () => {
    // ============================================================================
    // SETUP
    // ============================================================================
    beforeEach(() => resetAllMocks());

    // ============================================================================
    // CRUD OPERATIONS (Auto-generated)
    // ============================================================================
    const crudTests = generateCrudTests(config);
    crudTests.runAllTests();

    // ============================================================================
    // BUSINESS LOGIC (Custom)
    // ============================================================================
    describe('Business-specific operations', () => {
        // Tests específicos del dominio
    });

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================
    describe('Error handling', () => {
        // Tests de manejo de errores
    });

    // ============================================================================
    // EDGE CASES
    // ============================================================================
    describe('Edge cases', () => {
        // Casos límite
    });
});
```

### 2. **Generación de Datos de Prueba**

```typescript
// ✨ Uso del generador unificado
const user = generateTestData.user({ role: 'admin' });
const business = generateTestData.business({
    namePlace: 'Custom Name',
    rating: 5,
});
const review = generateTestData.review({
    rating: 5,
    author: user._id,
});
```

### 3. **Assertions Consistentes**

```typescript
// ✨ Helpers de assertions unificados
expectResponse.success(response); // 200 + success: true
expectResponse.created(response); // 201 + data defined
expectResponse.validation(response); // 400 + validation errors
expectResponse.unauthorized(response); // 401 + unauthorized
expectResponse.notFound(response); // 404 + not found
```

### 4. **Requests Simplificados**

```typescript
// ✨ Helpers de requests unificados
const response = await makeRequest.get(app, '/api/v1/businesses', token);
const response = await makeRequest.post(app, '/api/v1/businesses', data, token);
const response = await makeRequest.put(app, `/api/v1/businesses/${id}`, data, token);
const response = await makeRequest.delete(app, `/api/v1/businesses/${id}`, token);
```

## 📊 Scripts de NPM Actualizados

```bash
# Ejecutar todos los tests
npm run test

# Tests por tipo
npm run test:unit           # Controllers, Services, Middleware
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests

# Coverage
npm run test:coverage
npm run test:coverage:unit
npm run test:coverage:integration

# Tests específicos
npm run test:controllers
npm run test:services
npm run test:middleware

# Development
npm run test:watch
npm run test:debug
npm run test:ui

# CI/CD
npm run test:ci
npm run test:ci:unit
npm run test:ci:integration
```

## 🔄 Plan de Migración Gradual

### Fase 1: Setup (✅ Completado)

- [x] Configuración unificada
- [x] Helpers consolidados
- [x] Scripts actualizados

### Fase 2: Migración de Tests Críticos

- [ ] Tests de autenticación
- [ ] Tests de controladores principales
- [ ] Tests de servicios core

### Fase 3: Migración Completa

- [ ] Todos los tests de controladores
- [ ] Todos los tests de servicios
- [ ] Tests de middleware
- [ ] Tests de integración

### Fase 4: Cleanup

- [ ] Eliminar archivos obsoletos
- [ ] Actualizar documentación
- [ ] Optimizar coverage

## 🗑️ Archivos a Eliminar

Una vez completada la migración:

```
src/test/
├── setup/
│   ├── integrationSetup.ts          # ❌ Eliminar
│   └── vitestSetup.ts               # ❌ Eliminar
├── integration/
│   ├── jest.integration.setup.ts    # ❌ Eliminar
│   ├── jest.mock.setup.ts          # ❌ Eliminar
│   └── jest.simple.setup.ts        # ❌ Eliminar
├── utils/
│   ├── testHelpers.ts               # ❌ Consolidado
│   ├── controllerTestHelpers.ts     # ❌ Consolidado
│   ├── responseAssertions.ts        # ❌ Consolidado
│   └── mockGenerators.ts           # ❌ Consolidado
└── types/
    ├── mockTypes.ts                 # ❌ Simplificado
    └── testTypes.ts                 # ❌ Simplificado
```

## 📈 Beneficios Esperados

### 🎯 Simplicidad

- **80% menos código** en configuración
- **Configuración única** para todos los tipos de test
- **Patrones consistentes** en toda la codebase

### 🚀 Productividad

- **Tests CRUD automáticos** (5 tests en 1 línea)
- **Helpers reutilizables** para casos comunes
- **Menos boilerplate** en cada test

### 🛡️ Robustez

- **Mocks consistentes** y confiables
- **Cobertura optimizada** con métricas claras
- **Menos falsos positivos** en tests

### 📊 Coverage Mejorado

- **Thresholds específicos** por área
- **Exclusiones optimizadas**
- **Reportes consolidados**

## 🆘 Troubleshooting

### Problema: Tests fallan después de migración

**Solución**: Verificar que los mocks están usando la nueva configuración unificada.

### Problema: TokenService mock no funciona

**Solución**: Usar `createMockTokenService()` del archivo unificado.

### Problema: Tests de integración lentos

**Solución**: Verificar que `clearDatabase()` se ejecuta solo cuando es necesario.

### Problema: Coverage bajo

**Solución**: Usar `generateCrudTests()` para coverage automático de operaciones básicas.

## 🎓 Próximos Pasos

1. **Migrar un test existente** usando la nueva estructura
2. **Verificar que funciona** correctamente
3. **Aplicar el patrón** a tests similares
4. **Eliminar archivos obsoletos** gradualmente
5. **Documentar casos específicos** que requieran atención especial

---

**¿Preguntas?** Consulta los ejemplos en `src/test/controllers/businessControllers.refactored.test.ts`
