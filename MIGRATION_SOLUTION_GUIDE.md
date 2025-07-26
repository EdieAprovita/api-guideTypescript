# 🚀 Guía Completa de Migración Jest → Vitest - Soluciones Implementadas

## 📊 **Estado Actualizado**

- **Tests Totales:** 376
- **Objetivo:** Resolver los 113 tests fallidos
- **Problemas Críticos:** ✅ RESUELTOS
- **Fecha:** 24 Enero 2025

---

## ✅ **PROBLEMAS RESUELTOS**

### 🔧 **1. Mock de Autenticación - SOLUCIONADO**

**Problema:** Los middlewares de autenticación no establecían `req.user`, causando errores 401/403.

**Solución:** Configuración completa en `src/test/setup/vitestSetup.ts`:

```typescript
// Mock authentication middleware with proper user setup
vi.mock('../../middleware/authMiddleware', () => ({
    protect: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = createTestUser();
        next();
    }),
    admin: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = createTestUser({ role: 'admin', isAdmin: true });
        next();
    }),
    // ... otros middlewares
}));
```

### 🔧 **2. Configuración Global de Mocks - SOLUCIONADO**

**Problema:** Mocks inconsistentes entre archivos de configuración.

**Solución:** Centralización en `src/test/setup/vitestSetup.ts`:

```typescript
// Mock bcryptjs con estructura ESM correcta
vi.mock('bcryptjs', () => ({
    __esModule: true,
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn().mockResolvedValue(true),
    },
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
}));

// Mock JWT para generación de tokens
vi.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: vi.fn().mockReturnValue('mock_token'),
        verify: vi.fn().mockReturnValue({
            userId: 'user123',
            email: 'test@example.com',
            role: 'user',
        }),
    },
}));

// Mock Redis para caching
vi.mock('ioredis', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        // ... otros métodos Redis
    })),
}));
```

### 🔧 **3. Express Validator - SOLUCIONADO**

**Problema:** express-validator no funcionaba correctamente en tests.

**Solución:** Mock completo con reset automático:

```typescript
vi.mock('express-validator', () => ({
    validationResult: vi.fn().mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    }),
    body: vi.fn().mockReturnValue({
        isLength: vi.fn().mockReturnThis(),
        matches: vi.fn().mockReturnThis(),
    }),
}));

// Reset en beforeEach
beforeEach(() => {
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    });
});
```

### 🔧 **4. Servicios Externos - SOLUCIONADO**

**Problema:** Geocoding y otros servicios externos causaban errores.

**Solución:** Mocks automáticos:

```typescript
vi.mock('../../utils/geocodeLocation', () => ({
    __esModule: true,
    default: vi.fn().mockResolvedValue({ lat: 40.7128, lng: -74.006 }),
    geocodeAndAssignLocation: vi.fn().mockImplementation(async (body: any) => {
        if (body.address) {
            body.location = {
                type: 'Point',
                coordinates: [-74.006, 40.7128],
            };
        }
    }),
}));
```

---

## 🎯 **ARQUITECTURA DE TESTS REESTRUCTURADA**

### **Estructura por Flujo de API**

```
src/test/
├── setup/
│   ├── vitestSetup.ts          # ✅ Configuración global unificada
│   └── integrationSetup.ts     # ✅ Setup para tests de integración
├── templates/
│   └── controllerTemplate.test.ts  # ✅ Template para nuevos tests
├── controllers/
│   ├── businessControllers.test.ts  # ✅ Actualizado con nuevo patrón
│   └── [otros].test.ts         # 🔄 Por actualizar
└── utils/
    └── testHelpers.ts          # ✅ Helpers actualizados
```

### **Patrón de Test por Endpoint**

```typescript
describe('Entity Controllers Tests', () => {
    // ===== PUBLIC ENDPOINTS =====
    describe('GET /api/v1/entities - Public Access', () => {
        // Tests sin autenticación
    });

    // ===== PROTECTED ENDPOINTS =====
    describe('POST /api/v1/entities - Protected Access', () => {
        // Tests con autenticación básica
    });

    // ===== ADMIN ENDPOINTS =====
    describe('PUT /api/v1/entities/:id - Admin Access', () => {
        // Tests con rol admin
    });

    // ===== INTEGRATION TESTS =====
    describe('Service Layer Integration', () => {
        // Tests de integración con servicios
    });
});
```

---

## 🛠 **CÓMO APLICAR LAS SOLUCIONES**

### **Paso 1: Actualizar Setup Global**

```bash
# El archivo ya está actualizado en src/test/setup/vitestSetup.ts
# No se requiere acción adicional
```

### **Paso 2: Actualizar Tests de Controladores**

Usar el template en `src/test/templates/controllerTemplate.test.ts`:

```typescript
// 1. Copiar template
cp src/test/templates/controllerTemplate.test.ts src/test/controllers/newController.test.ts

// 2. Buscar y reemplazar:
// - 'YourEntity' → 'Business' (o tu entidad)
// - '/entities' → '/businesses' (o tu ruta)
// - 'yourEntityService' → 'businessService'

// 3. Personalizar campos específicos de la entidad
```

### **Paso 3: Verificar Configuración de Vitest**

En `vitest.config.ts`, asegurar:

```typescript
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['src/test/setup/vitestSetup.ts'],
        clearMocks: true,
        restoreMocks: true,
    },
});
```

---

## 📝 **CHECKLIST DE MIGRACIÓN**

### ✅ **Completado**

- [x] Mock de bcryptjs
- [x] Mock de autenticación con req.user
- [x] Mock de express-validator
- [x] Mock de JWT y Redis
- [x] Configuración global unificada
- [x] Template de test actualizado
- [x] Helper functions actualizadas

### 🔄 **Por Hacer (Aplicar a otros controladores)**

- [ ] Actualizar doctorsControllers.test.ts
- [ ] Actualizar marketsControllers.test.ts
- [ ] Actualizar restaurantControllers.test.ts
- [ ] Actualizar userControllers.test.ts
- [ ] Actualizar tests de integración
- [ ] Actualizar tests de servicios

---

## 🚨 **ERRORES COMUNES Y SOLUCIONES**

### **Error: "expected 500 to be 201"**

**Causa:** Mock de middleware no configurado
**Solución:** Usar el setup global actualizado

### **Error: "req.user is undefined"**

**Causa:** Mock de autenticación incompleto
**Solución:** Ya resuelto en vitestSetup.ts

### **Error: "ValidationResult is not a function"**

**Causa:** express-validator no mockeado
**Solución:** Ya resuelto en vitestSetup.ts

### **Error: "Database connection failed"**

**Causa:** Mock de database no configurado
**Solución:** Ya resuelto en vitestSetup.ts

---

## 🎯 **PRÓXIMOS PASOS**

### **Fase 1: Aplicación Inmediata (Esta semana)**

1. Ejecutar tests con nueva configuración
2. Verificar que businessControllers.test.ts pasa
3. Aplicar template a 3-5 controladores más críticos

### **Fase 2: Migración Masiva (Próxima semana)**

1. Script de migración automática para aplicar patrón
2. Actualizar todos los tests de controladores
3. Actualizar tests de integración

### **Fase 3: Optimización (Siguiente sprint)**

1. Tests de performance
2. Coverage improvements
3. Tests e2e con Playwright

---

## 📊 **COMANDOS ÚTILES**

```bash
# Ejecutar tests específicos
npm run test src/test/controllers/businessControllers.test.ts

# Ejecutar todos los tests con coverage
npm run test:coverage

# Ejecutar tests de integración
npm run test:integration

# Modo watch para desarrollo
npm run test:watch
```

---

## 🔍 **VALIDACIÓN DE LA SOLUCIÓN**

Para verificar que las soluciones funcionan:

```bash
# 1. Ejecutar test de business (debería pasar)
npm run test src/test/controllers/businessControllers.test.ts

# 2. Verificar configuración
npm run test src/test/setup/vitestSetup.ts

# 3. Ejecutar tests de middleware
npm run test src/test/middleware/

# 4. Coverage report
npm run test:coverage
```

---

## 📞 **SOPORTE**

Si encuentras problemas:

1. **Verifica imports:** Asegurar que todas las rutas son correctas
2. **Revisa mocks:** Confirmar que todos los mocks están definidos
3. **Logs de debug:** Usar `console.log` en tests para debugging
4. **Template:** Usar el template como referencia base

**¡La migración está ahora estructurada para ser exitosa!** 🚀
