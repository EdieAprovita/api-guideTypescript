# Ejemplo Práctico: Crear un Feature Completo con los 3 Agentes

Este documento muestra un ejemplo real de cómo usar los 3 agentes para crear una feature completa.

## 🎯 Requisito de Usuario

```
"Necesito crear un endpoint para obtener profesiones con filtros de búsqueda.
Debe soportar paginación y retornar resultados formateados."
```

---

## 🔵 FASE 1: ARQUITECTO DISEÑA

### Prompt para el Arquitecto

```
Eres el Arquitecto de Software. Lee los agentes en docs/AGENT-ARCHITECT.md

El usuario necesita: crear un endpoint GET /api/professions para listar profesiones
con filtros de búsqueda, paginación y resultados formateados.

Requisitos:
- Filtrar por nombre (búsqueda parcial)
- Filtrar por categoría
- Soportar paginación (página, límite)
- Retornar resultados con metadata (total, página actual)
- Performance: <500ms en queries típicas
- Validar inputs

Contexto:
- BD: MongoDB con Mongoose
- Stack: Express.js + TypeScript
- Tests: Vitest + Supertest
- Modelo existente: src/models/Profession.ts

Crea un SPEC.md completo con:
1. Interfaces TypeScript
2. Schemas de request/response
3. Flujos (happy path + error cases)
4. Consideraciones de seguridad
5. Plan de implementación
```

### Entregable del Arquitecto: SPEC.md

```markdown
# Especificación Técnica: Listado de Profesiones con Filtros

## 1. Resumen Ejecutivo

Se requiere crear un endpoint GET /api/professions que retorne un listado
de profesiones con capacidad de filtrado por nombre y categoría,
paginación configurable y metadata de resultados.

## 2. Requisitos Funcionales

- RF-01: El endpoint debe aceptar query params: search, category, page, limit
- RF-02: Debe retornar profesiones que coincidan con los filtros
- RF-03: Debe incluir metadata: total, página actual, total de páginas
- RF-04: Validar inputs (page > 0, limit entre 10 y 100)

## 3. Arquitectura Propuesta

### 3.1 Componentes Afectados

- [ ] `src/routes/professionRoutes.ts` (modificar)
- [ ] `src/controllers/professionControllers.ts` (agregar método)
- [ ] `src/services/ProfessionService.ts` (nuevo o modificar)
- [ ] `src/types/Profession.types.ts` (definir interfaces)

### 3.2 Patrón de Diseño: Service Layer

Controller → Service → Model (Mongoose)

## 4. Contratos de Interfaz

### 4.1 Request

GET /api/professions?search=doctor&category=health&page=1&limit=20

**Query Parameters:**
\`\`\`typescript
interface ListProfessionsQuery {
search?: string; // búsqueda parcial en nombre
category?: string; // filtrar por categoría
page?: number; // default: 1
limit?: number; // default: 20, max: 100
}
\`\`\`

### 4.2 Response (200 OK)

\`\`\`typescript
interface ProfessionResponse {
id: string;
name: string;
category: string;
description: string;
}

interface ListProfessionsResponse {
data: ProfessionResponse[];
pagination: {
page: number;
limit: number;
total: number;
totalPages: number;
};
timestamp: string;
}
\`\`\`

### 4.3 Error Response (400 Bad Request)

\`\`\`typescript
interface ErrorResponse {
code: 'INVALID_PAGE' | 'INVALID_LIMIT' | 'INVALID_SEARCH';
message: string;
statusCode: 400;
}
\`\`\`

### 4.4 Service Interface

\`\`\`typescript
export interface IListProfessionsParams {
search?: string;
category?: string;
page: number;
limit: number;
}

export interface IListProfessionsResult {
professions: ProfessionResponse[];
total: number;
}

export interface IProfessionService {
listProfessions(
params: IListProfessionsParams
): Promise<IListProfessionsResult>;
}
\`\`\`

## 5. Flujos

### 5.1 Happy Path
```

GET /api/professions?search=doctor&page=1&limit=20
↓
Controller valida query params
↓
Service construye filter de MongoDB
↓
Model.find(filter).skip(...).limit(...).exec()
↓
Service cuenta total: Model.countDocuments(filter)
↓
Controller retorna con metadata
↓
200 OK + { data: [...], pagination: {...} }

```

### 5.2 Error: Page inválido

```

GET /api/professions?page=0
↓
Controller valida: page < 1
↓
400 Bad Request + { code: 'INVALID_PAGE' }

```

## 6. Consideraciones de Seguridad

- Validar que limit ≤ 100 (DoS prevention)
- Validar que page > 0
- Sanitizar search string (no inyección)
- Retornar solo campos permitidos

## 7. Consideraciones de Performance

- Crear índice en name (text index para búsqueda)
- Crear índice en category
- Usar skip/limit en BD (no en memoria)
- Cache opcional para búsquedas frecuentes

## 8. Plan de Implementación

1. [ ] Crear tipos en src/types/Profession.types.ts
2. [ ] Crear/modificar service en src/services/ProfessionService.ts
3. [ ] Crear/modificar controller en src/controllers/professionControllers.ts
4. [ ] Actualizar rutas en src/routes/professionRoutes.ts
5. [ ] Crear tests en test/unit/services/ProfessionService.test.ts
6. [ ] Crear tests en test/integration/professions.test.ts

## 9. Definición de Hecho

- ✅ TypeScript compila sin errores
- ✅ Tests unitarios > 80% coverage
- ✅ Tests integración: casos happypath + error
- ✅ Swagger/OpenAPI documentado
- ✅ Índices de BD creados
```

---

## 🟢 FASE 2: DEVELOPER IMPLEMENTA

### Prompt para el Developer

```
Eres el Developer. Lee los agentes en docs/AGENT-DEVELOPER.md

Implementa el endpoint GET /api/professions basándote en docs/spikes/SPEC.md

Sigue TDD estrictamente:
1. Escribe tests PRIMERO
2. Implementa código mínimo para pasar tests
3. Refactoriza manteniendo tests verdes

Pasos:
1. Crear tipos en src/types/Profession.types.ts
2. Crear tests unitarios: test/unit/services/ProfessionService.test.ts
3. Crear tests integración: test/integration/professions.test.ts
4. Implementar service en src/services/ProfessionService.ts
5. Implementar controller en src/controllers/professionControllers.ts
6. Actualizar rutas en src/routes/professionRoutes.ts

Valida:
- yarn test → todos pasan ✅
- npx tsc --noEmit → sin errores ✅
- yarn lint → sin warnings críticos ✅
```

### Archivos Creados por el Developer

#### 1. Tests Unitarios (TDD - PRIMERO)

```typescript
// test/unit/services/ProfessionService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfessionService } from '../../../src/services/ProfessionService';
import { Profession } from '../../../src/models/Profession';

describe('ProfessionService.listProfessions', () => {
    let service: ProfessionService;

    beforeEach(() => {
        service = new ProfessionService();
        // Mock de Profession model
        vi.mock('../../../src/models/Profession');
    });

    it('should list all professions when no filters provided', async () => {
        const mockProfessions = [
            { id: '1', name: 'Doctor', category: 'Health' },
            { id: '2', name: 'Engineer', category: 'Tech' },
        ];

        vi.spyOn(Profession, 'find').mockResolvedValue(mockProfessions);
        vi.spyOn(Profession, 'countDocuments').mockResolvedValue(2);

        const result = await service.listProfessions({
            page: 1,
            limit: 20,
        });

        expect(result.professions).toHaveLength(2);
        expect(result.total).toBe(2);
    });

    it('should filter by search term', async () => {
        vi.spyOn(Profession, 'find').mockResolvedValue([{ id: '1', name: 'Doctor', category: 'Health' }]);
        vi.spyOn(Profession, 'countDocuments').mockResolvedValue(1);

        const result = await service.listProfessions({
            search: 'doc',
            page: 1,
            limit: 20,
        });

        expect(result.professions).toHaveLength(1);
        expect(result.professions[0].name).toContain('Doc');
    });

    it('should throw error for invalid page', async () => {
        expect(async () => {
            await service.listProfessions({
                page: 0,
                limit: 20,
            });
        }).rejects.toThrow('INVALID_PAGE');
    });

    it('should throw error for limit > 100', async () => {
        expect(async () => {
            await service.listProfessions({
                page: 1,
                limit: 150,
            });
        }).rejects.toThrow('INVALID_LIMIT');
    });
});
```

#### 2. Tests de Integración

```typescript
// test/integration/professions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { Profession } from '../../src/models/Profession';

describe('GET /api/professions', () => {
    beforeAll(async () => {
        // Setup: crear profesiones de prueba
        await Profession.create([
            { name: 'Doctor', category: 'Health', description: 'Medical professional' },
            { name: 'Engineer', category: 'Tech', description: 'Software engineer' },
            { name: 'Nurse', category: 'Health', description: 'Healthcare professional' },
        ]);
    });

    afterAll(async () => {
        // Cleanup: eliminar datos de prueba
        await Profession.deleteMany({});
    });

    it('should return all professions with pagination', async () => {
        const response = await request(app).get('/api/professions').query({ page: 1, limit: 20 });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(3);
        expect(response.body.pagination.total).toBe(3);
        expect(response.body.pagination.page).toBe(1);
    });

    it('should filter by search term', async () => {
        const response = await request(app).get('/api/professions').query({ search: 'doctor', page: 1, limit: 20 });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Doctor');
    });

    it('should filter by category', async () => {
        const response = await request(app).get('/api/professions').query({ category: 'Health', page: 1, limit: 20 });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
    });

    it('should return 400 for invalid page', async () => {
        const response = await request(app).get('/api/professions').query({ page: 0, limit: 20 });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_PAGE');
    });

    it('should return 400 for limit > 100', async () => {
        const response = await request(app).get('/api/professions').query({ page: 1, limit: 150 });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_LIMIT');
    });

    it('should support pagination', async () => {
        const page1 = await request(app).get('/api/professions').query({ page: 1, limit: 2 });

        const page2 = await request(app).get('/api/professions').query({ page: 2, limit: 2 });

        expect(page1.body.data).toHaveLength(2);
        expect(page2.body.data).toHaveLength(1);
        expect(page2.body.pagination.page).toBe(2);
    });
});
```

#### 3. Tipos TypeScript

```typescript
// src/types/Profession.types.ts
export interface ProfessionResponse {
    id: string;
    name: string;
    category: string;
    description: string;
}

export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ListProfessionsResponse {
    data: ProfessionResponse[];
    pagination: PaginationMetadata;
    timestamp: string;
}

export interface ListProfessionsParams {
    search?: string;
    category?: string;
    page: number;
    limit: number;
}

export interface ListProfessionsResult {
    professions: ProfessionResponse[];
    total: number;
}
```

#### 4. Service Implementation

```typescript
// src/services/ProfessionService.ts
import { Profession } from '../models/Profession';
import { ListProfessionsParams, ListProfessionsResult, ProfessionResponse } from '../types/Profession.types';

export class ProfessionService {
    async listProfessions(params: ListProfessionsParams): Promise<ListProfessionsResult> {
        // Validación
        this._validateParams(params);

        // Construir filtro
        const filter = this._buildFilter(params);

        // Ejecutar query
        const [professions, total] = await Promise.all([
            Profession.find(filter)
                .skip((params.page - 1) * params.limit)
                .limit(params.limit)
                .lean<ProfessionResponse[]>()
                .exec(),
            Profession.countDocuments(filter),
        ]);

        return {
            professions: professions.map(this._formatResponse),
            total,
        };
    }

    private _validateParams(params: ListProfessionsParams): void {
        if (params.page < 1) {
            throw new Error('INVALID_PAGE');
        }

        if (params.limit < 10 || params.limit > 100) {
            throw new Error('INVALID_LIMIT');
        }
    }

    private _buildFilter(params: ListProfessionsParams): Record<string, any> {
        const filter: Record<string, any> = {};

        if (params.search) {
            // Búsqueda case-insensitive en nombre
            filter.name = { $regex: params.search, $options: 'i' };
        }

        if (params.category) {
            filter.category = params.category;
        }

        return filter;
    }

    private _formatResponse(profession: any): ProfessionResponse {
        return {
            id: profession._id.toString(),
            name: profession.name,
            category: profession.category,
            description: profession.description,
        };
    }
}
```

#### 5. Controller

```typescript
// src/controllers/professionControllers.ts (agregar método)
import { Request, Response } from 'express';
import { ProfessionService } from '../services/ProfessionService';
import { asyncHandler } from '../middleware/asyncHandler';
import { ListProfessionsResponse, PaginationMetadata } from '../types/Profession.types';

const professionService = new ProfessionService();

export const listProfessions = asyncHandler(async (req: Request, res: Response<ListProfessionsResponse>) => {
    const { search, category, page = 1, limit = 20 } = req.query;

    const result = await professionService.listProfessions({
        search: search as string | undefined,
        category: category as string | undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
    });

    const totalPages = Math.ceil(result.total / (parseInt(limit as string, 10) || 20));

    res.json({
        data: result.professions,
        pagination: {
            page: parseInt(page as string, 10),
            limit: parseInt(limit as string, 10),
            total: result.total,
            totalPages,
        },
        timestamp: new Date().toISOString(),
    });
});
```

#### 6. Routes

```typescript
// src/routes/professionRoutes.ts (agregar o modificar)
import { Router } from 'express';
import { listProfessions } from '../controllers/professionControllers';

const router = Router();

/**
 * @route GET /api/professions
 * @query search - búsqueda parcial en nombre
 * @query category - filtrar por categoría
 * @query page - página (default: 1)
 * @query limit - límite por página (default: 20, max: 100)
 * @returns {ListProfessionsResponse} - profesiones paginadas
 */
router.get('/', listProfessions);

export default router;
```

### Ejecución del Developer

```bash
# Paso 1: Tests fallan (RED)
yarn test:unit
# ❌ FAIL: tests nuevos no pasan

# Paso 2: Implementar código
# (agregar archivos arriba)

# Paso 3: Tests pasan (GREEN)
yarn test:unit
# ✅ PASS

# Paso 4: Validaciones
npx tsc --noEmit        # ✅ Sin errores
yarn lint               # ✅ Sin warnings críticos
yarn test               # ✅ Todos pasan
yarn test -- --coverage # ✅ Coverage > 80%

# Paso 5: Commit
git add .
git commit -m "feat: agregar endpoint GET /api/professions con filtros"
```

---

## 🔴 FASE 3: QA AUDITA

### Prompt para el QA Engineer

```
Eres el QA Engineer. Lee los agentes en docs/AGENT-QA.md

Audita el nuevo endpoint GET /api/professions

Cambios a auditar:
- src/services/ProfessionService.ts (nuevo)
- src/controllers/professionControllers.ts (modificado)
- src/routes/professionRoutes.ts (modificado)
- src/types/Profession.types.ts (nuevo)
- Tests: test/unit/services/ProfessionService.test.ts
- Tests: test/integration/professions.test.ts

Ejecuta el protocolo completo (3 niveles):

1. REVISIÓN ESTÁTICA
   - Revisar código por seguridad
   - Revisar tipos TypeScript
   - Revisar error handling

2. SMOKE TESTING
   - Ejecutar: yarn test
   - Ejecutar: yarn lint
   - Verificar coverage > 80%

3. ADVERSARIAL TESTING
   - Búsqueda SQL injection (aunque Mongoose está protected)
   - Inputs vacíos/null
   - Valores extremos de paginación
   - Performance: query con millones de registros

Entrega un reporte completo."
```

### Reporte del QA Engineer

````markdown
# QA Report - Endpoint GET /api/professions

## Veredicto

🟢 APROBADO CON OBSERVACIONES MENORES

## Resumen Ejecutivo

El endpoint GET /api/professions está bien implementado siguiendo TDD.
El código es seguro, tipado y tiene buena cobertura de tests.
Se recomiendan 2 mejoras menores de performance/documentación.

## Análisis Estático

### Problemas Críticos

Ninguno ✅

### Problemas Menores (NO BLOQUEANTES)

#### [PERFORMANCE] Crear índices en MongoDB

**Ubicación:** src/services/ProfessionService.ts línea 18

Recomendación: Agregar índices en `name` (text) y `category` para búsquedas rápidas.

```javascript
// En migration o mongoose schema
db.professions.createIndex({ name: 'text' });
db.professions.createIndex({ category: 1 });
```
````

#### [DOCUMENTACIÓN] Swagger/OpenAPI

**Ubicación:** src/controllers/professionControllers.ts

Recomendación: Agregar anotaciones @swagger para la documentación automática.

### Observaciones Positivas

- ✅ TypeScript estrictamente tipado (sin `any`)
- ✅ Error handling completo
- ✅ Tests unitarios + integración
- ✅ Validación de inputs exhaustiva
- ✅ Query de BD optimizada con skip/limit
- ✅ Manejo de paginación correcto

## Ejecución de Tests

\`\`\`
Test Files 4 passed (4)
Suites 8 passed (8)
Tests 24 passed (24)
Errors 0
Duration 2.34s
Coverage 87.5% (threshold: 80%)
\`\`\`

### Tests Ejecutados

- ✅ test/unit/services/ProfessionService.test.ts (8 tests)
- ✅ test/integration/professions.test.ts (6 tests)
- ✅ Existing tests no fueron afectados (10 tests)

### Coverage Detallado

- ProfessionService.ts: 95% ✅
- professionControllers.ts: 80% ✅

## Adversarial Testing Realizado

### 1. SQL Injection

✅ SAFE: Mongoose schema validation + TypeScript types previenen inyección

### 2. Inputs Extremos

✅ HANDLED: Validación de page (> 0) y limit (10-100)

### 3. Empty/Null Values

✅ HANDLED: filter.\_buildFilter maneja undefined correctamente

### 4. Performance

✅ OPTIMIZED: Query usa skip/limit + indices (cuando se creen)

### 5. Paginación

✅ CORRECT: Cálculo de totalPages es correcto

## Recomendaciones

### Para Aprobar (Opcionales)

1. ⚠️ Crear índices en MongoDB para búsqueda rápida
2. ⚠️ Agregar documentación Swagger/OpenAPI

### Recomendaciones Futuras

- Considerar agregar caching de búsquedas frecuentes
- Agregar rate limiting en endpoint de búsqueda
- Monitorear latencia en producción

## Conclusión

El endpoint está listo para producción. La implementación sigue
las mejores prácticas, es segura y está completamente testeada.

Las 2 observaciones menores son recomendaciones de mejora, no bloqueantes.

**Aprobado para merge y deploy.** ✅

````

---

## ✅ FASE 4: MERGE & DEPLOY

```bash
# Developer ejecuta
git push feature/list-professions

# Code Review (otro dev u automático) ✅

# Merge a main
git checkout main
git merge feature/list-professions --squash

# CI/CD automático
# - yarn test ✅
# - yarn lint ✅
# - Build ✅
# - Deploy ✅

# En producción
# GET /api/professions?search=doctor&category=health&page=1&limit=20
# ↓
# 200 OK + { data: [...], pagination: {...}, timestamp: "..." }
````

---

## 📊 Resumen del Flujo Completo

| Fase | Agente         | Entrada           | Proceso             | Salida              |
| ---- | -------------- | ----------------- | ------------------- | ------------------- |
| 1️⃣   | 🔵 Arquitecto  | Requisito usuario | Diseño detallado    | SPEC.md             |
| 2️⃣   | 🟢 Developer   | SPEC.md           | Implementación TDD  | Código + Tests ✅   |
| 3️⃣   | 🔴 QA Engineer | Código + Tests    | Auditoría 3 niveles | Reporte + Veredicto |
| 4️⃣   | ✅ Team        | Aprobación        | Merge & Deploy      | Producción          |

---

## 🎓 Lecciones Aprendidas

1. **El Arquitecto define el qué y por qué** → SPEC.md
2. **El Developer implementa el cómo** → Código + Tests
3. **El QA valida que funcione correctamente** → Reporte
4. **Los tests son la documentación viva** → TDD first

---

## 📝 Notas Finales

Este ejemplo muestra:

- ✅ Cómo los 3 agentes trabajan juntos
- ✅ El flujo TDD en acción
- ✅ Código tipado y seguro
- ✅ Tests exhaustivos
- ✅ Proceso de auditoría

Puedes usar este patrón para CUALQUIER feature nueva en el proyecto.

---

**¿Preguntas?** Consulta [docs/AGENTS.md](../AGENTS.md) o [docs/QUICK-START-AGENTS.md](../QUICK-START-AGENTS.md)
