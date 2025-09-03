# 📋 Testing Coverage Plan - Jest to Vitest Migration

## 🎯 **Objetivo Principal**
Migrar de Jest a Vitest y aumentar la cobertura de testing del **53.94%** actual al **70%+** en 3-4 semanas.

## 📊 **Estado Actual**
- **Cobertura Global**: 53.94% (Objetivo: 70%+)
- **Statements**: 53.94% → 70%+
- **Branches**: 58.35% → 70%+
- **Functions**: 50.23% → 70%+
- **Lines**: 53.94% → 70%+
- **Archivos fuente**: 81
- **Archivos de test**: 39
- **Tests faltantes**: ~25-30

## ⚠️ **Problemas Identificados**

### Archivos con 0% de cobertura (CRÍTICO)
- `src/server.ts` - Archivo principal sin tests
- `src/config/db.ts` - Conexión BD sin tests
- `src/controllers/cacheController.ts` - No existe
- `src/scripts/*` - Scripts sin tests
- Configuración Jest excluyendo areas críticas

### Configuración Jest Problemática
```javascript
// jest.config.base.js - PROBLEMÁTICO
collectCoverageFrom: [
    '!src/controllers/**',  // ❌ Excluye controllers
    '!src/services/**',     // ❌ Excluye services
    '!src/middleware/**',   // ❌ Excluye middleware
]
```

---

## 🚀 **FASE 1: Migración Jest → Vitest**

### 1.1 Instalación y Configuración

#### Remover Jest
```bash
npm uninstall jest @types/jest ts-jest c8
```

#### Instalar Vitest
```bash
npm install -D vitest @vitest/coverage-v8 @vitest/ui
npm install -D @types/node # Si no está instalado
```

### 1.2 Crear Configuración Vitest Optimizada

**Archivo: `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20000,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      provider: 'v8', // Más rápido que istanbul
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      clean: true,
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/types/**',
        'src/node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        // Thresholds específicos por módulos críticos
        'src/controllers/**/*.ts': {
          branches: 75,
          functions: 80,
          lines: 75,
          statements: 75
        },
        'src/services/**/*.ts': {
          branches: 75,
          functions: 80,
          lines: 75,
          statements: 75
        },
        'src/middleware/**/*.ts': {
          branches: 70,
          functions: 75,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### 1.3 Actualizar package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "test:ci": "vitest run --coverage --reporter=verbose",
    "test:unit": "vitest run src/test/unit",
    "test:integration": "vitest run src/test/integration",
    "test:services": "vitest run src/test/services",
    "test:controllers": "vitest run src/test/controllers",
    "test:middleware": "vitest run src/test/middleware"
  }
}
```

### 1.4 Migrar Archivos de Setup

**Actualizar `src/test/setup.ts`**
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})
```

---

## 🎯 **FASE 2: Identificación de Tests por Prioridad**

### PRIORIDAD CRÍTICA (0% cobertura)
| Archivo | Test a Crear | Impacto |
|---------|--------------|---------|
| `src/server.ts` | `src/test/server.test.ts` | ⭐⭐⭐ |
| `src/app.ts` | `src/test/app.test.ts` | ⭐⭐⭐ |
| `src/config/db.ts` | `src/test/config/db.test.ts` | ⭐⭐⭐ |
| `src/controllers/cacheController.ts` | `src/test/controllers/cacheController.test.ts` | ⭐⭐ |

### PRIORIDAD ALTA (< 50% cobertura)
| Archivo | Cobertura Actual | Objetivo | Test |
|---------|------------------|----------|------|
| `CacheWarmingService.ts` | 14.09% | 75%+ | `cacheWarmingService.test.ts` |
| `CacheAlertService.ts` | 38.09% | 75%+ | `cacheAlertService.test.ts` |
| `PostService.ts` | 36.36% | 75%+ | `postService.test.ts` |
| `ReviewService.ts` | 25.27% | 75%+ | `reviewService.test.ts` |
| `errorHandler.ts` | 34.55% | 75%+ | `errorHandler.test.ts` |
| `cache.ts` | 26.17% | 75%+ | `cache.test.ts` |

### PRIORIDAD MEDIA (50-65% cobertura)
| Archivo | Cobertura Actual | Objetivo |
|---------|------------------|----------|
| Controllers diversos | 45.89% | 75%+ |
| Middleware auth | 63.93% | 75%+ |
| Services varios | 49.86% | 75%+ |

### Scripts sin Tests
- `src/scripts/seedData.ts` → `src/test/scripts/seedData.test.ts`
- `src/scripts/checkData.ts` → `src/test/scripts/checkData.test.ts`
- `src/scripts/cacheMonitor.ts` → `src/test/scripts/cacheMonitor.test.ts`

---

## 🚀 **FASE 3: Plan de Implementación por Sprints**

### **Sprint 1 (Semana 1): Migración y Tests Core**
**Objetivo**: Migración completa + 30% cobertura mínima

#### Tareas:
1. **Migración técnica completa**
   - Desinstalar Jest y dependencias
   - Instalar y configurar Vitest
   - Migrar scripts package.json
   - Verificar que tests existentes funcionan

2. **Tests críticos del core**

**`src/test/server.test.ts`**
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app, server } from '../server'

describe('Server Core', () => {
  afterAll(async () => {
    if (server.listening) {
      server.close()
    }
  })

  describe('Server Startup', () => {
    it('should start server on correct port', async () => {
      expect(server.listening).toBe(true)
    })

    it('should respond to health check', async () => {
      const response = await request(app).get('/health')
      expect(response.status).toBe(200)
    })

    it('should handle API documentation route', async () => {
      const response = await request(app).get('/api-docs')
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle unhandled rejection', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
      
      process.emit('unhandledRejection', new Error('Test error'), Promise.resolve())
      
      // Verify error handling logic
      expect(mockExit).toHaveBeenCalledWith(1)
      mockExit.mockRestore()
    })

    it('should handle uncaught exception', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
      
      process.emit('uncaughtException', new Error('Test error'))
      
      expect(mockExit).toHaveBeenCalledWith(1)
      mockExit.mockRestore()
    })

    it('should handle SIGTERM gracefully', () => {
      const mockClose = vi.spyOn(server, 'close')
      
      process.emit('SIGTERM')
      
      expect(mockClose).toHaveBeenCalled()
      mockClose.mockRestore()
    })
  })
})
```

**`src/test/config/db.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import connectDB from '../config/db'

// Mock mongoose
vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
    connection: {
      on: vi.fn(),
      close: vi.fn()
    }
  }
}))

describe('Database Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DB
  })

  describe('Successful Connection', () => {
    it('should connect to MongoDB successfully', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      
      const mockConnection = {
        connection: {
          host: 'localhost',
          port: 27017,
          name: 'test'
        }
      }
      
      vi.mocked(mongoose.connect).mockResolvedValue(mockConnection as any)
      
      await expect(connectDB()).resolves.not.toThrow()
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false
        })
      )
    })

    it('should set up connection event handlers', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      vi.mocked(mongoose.connect).mockResolvedValue({
        connection: { host: 'localhost', port: 27017, name: 'test' }
      } as any)
      
      await connectDB()
      
      expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
    })
  })

  describe('Error Handling', () => {
    it('should throw error when DB environment variable is missing', async () => {
      await expect(connectDB()).rejects.toThrow('MongoDB URI is not defined')
    })

    it('should handle connection errors', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      
      const connectionError = new Error('Connection failed')
      vi.mocked(mongoose.connect).mockRejectedValue(connectionError)
      
      await expect(connectDB()).rejects.toThrow('Error connecting to the database')
    })
  })

  describe('Graceful Shutdown', () => {
    it('should close connection on SIGINT', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      vi.mocked(mongoose.connect).mockResolvedValue({
        connection: { host: 'localhost', port: 27017, name: 'test' }
      } as any)
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
      
      await connectDB()
      
      // Simulate SIGINT
      process.emit('SIGINT')
      
      expect(mongoose.connection.close).toHaveBeenCalled()
      mockExit.mockRestore()
    })
  })
})
```

#### Criterio de Éxito Sprint 1:
- ✅ Migración técnica completada
- ✅ Tests básicos funcionando
- ✅ Coverage >= 30%
- ✅ CI/CD pipeline actualizado

---

### **Sprint 2 (Semana 2): Services Críticos**
**Objetivo**: 50% cobertura + services core completados

#### Tests de Services Prioritarios:

**`src/test/services/cacheWarmingService.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cacheWarmingService } from '../services/CacheWarmingService'
import { cacheService } from '../services/CacheService'
import { restaurantService } from '../services/RestaurantService'
import { businessService } from '../services/BusinessService'

// Mock dependencies
vi.mock('../services/CacheService')
vi.mock('../services/RestaurantService')
vi.mock('../services/BusinessService')

describe('CacheWarmingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cacheWarmingService.stopAutoWarming()
  })

  describe('warmUpCriticalData', () => {
    it('should warm up all critical data successfully', async () => {
      // Mock successful responses
      vi.mocked(restaurantService.getAllCached).mockResolvedValue([
        { _id: '1', name: 'Restaurant 1' },
        { _id: '2', name: 'Restaurant 2' }
      ] as any)
      
      vi.mocked(businessService.getAllCached).mockResolvedValue([
        { _id: '1', name: 'Business 1' }
      ] as any)
      
      vi.mocked(cacheService.set).mockResolvedValue(true)
      
      const result = await cacheWarmingService.warmUpCriticalData()
      
      expect(result.success).toBe(true)
      expect(result.itemsWarmed).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle partial failures gracefully', async () => {
      // Mock restaurant success but business failure
      vi.mocked(restaurantService.getAllCached).mockResolvedValue([
        { _id: '1', name: 'Restaurant 1' }
      ] as any)
      
      vi.mocked(businessService.getAllCached).mockRejectedValue(
        new Error('Database connection failed')
      )
      
      vi.mocked(cacheService.set).mockResolvedValue(true)
      
      const result = await cacheWarmingService.warmUpCriticalData()
      
      expect(result.success).toBe(false)
      expect(result.itemsWarmed).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Error warming businesses')
    })

    it('should prevent concurrent warming', async () => {
      vi.mocked(restaurantService.getAllCached).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 1000))
      )
      
      // Start two warming processes
      const promise1 = cacheWarmingService.warmUpCriticalData()
      const promise2 = cacheWarmingService.warmUpCriticalData()
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // One should succeed, one should be skipped
      const skippedResult = result1.success === false ? result1 : result2
      expect(skippedResult.errors).toContain('Warming already in progress')
    })
  })

  describe('startAutoWarming', () => {
    it('should start automatic warming with correct interval', async () => {
      vi.useFakeTimers()
      
      vi.mocked(restaurantService.getAllCached).mockResolvedValue([])
      vi.mocked(businessService.getAllCached).mockResolvedValue([])
      vi.mocked(cacheService.set).mockResolvedValue(true)
      
      // Start auto warming with 1 minute interval
      await cacheWarmingService.startAutoWarming(1)
      
      // Fast-forward 1 minute
      vi.advanceTimersByTime(60 * 1000)
      
      // Should have called warming functions multiple times
      expect(restaurantService.getAllCached).toHaveBeenCalledTimes(2) // Initial + interval
      
      vi.useRealTimers()
    })

    it('should stop auto warming correctly', async () => {
      const stats = cacheWarmingService.getWarmingStats()
      expect(stats.autoWarmingActive).toBe(false)
      
      await cacheWarmingService.startAutoWarming(30)
      
      const statsAfterStart = cacheWarmingService.getWarmingStats()
      expect(statsAfterStart.autoWarmingActive).toBe(true)
      
      cacheWarmingService.stopAutoWarming()
      
      const statsAfterStop = cacheWarmingService.getWarmingStats()
      expect(statsAfterStop.autoWarmingActive).toBe(false)
    })
  })

  describe('warmSpecificData', () => {
    it('should warm restaurants data only', async () => {
      vi.mocked(restaurantService.getAllCached).mockResolvedValue([
        { _id: '1', name: 'Restaurant 1' }
      ] as any)
      vi.mocked(cacheService.set).mockResolvedValue(true)
      
      const itemsWarmed = await cacheWarmingService.warmSpecificData('restaurants')
      
      expect(itemsWarmed).toBeGreaterThan(0)
      expect(restaurantService.getAllCached).toHaveBeenCalled()
      expect(businessService.getAllCached).not.toHaveBeenCalled()
    })

    it('should throw error for unknown data type', async () => {
      await expect(
        cacheWarmingService.warmSpecificData('unknown' as any)
      ).rejects.toThrow('Unknown data type: unknown')
    })
  })

  describe('getWarmingStats', () => {
    it('should return correct warming statistics', () => {
      const stats = cacheWarmingService.getWarmingStats()
      
      expect(stats).toHaveProperty('isWarming')
      expect(stats).toHaveProperty('lastWarmingTime')
      expect(stats).toHaveProperty('autoWarmingActive')
      expect(typeof stats.isWarming).toBe('boolean')
    })
  })
})
```

**`src/test/services/cacheAlertService.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CacheAlertService } from '../services/CacheAlertService'

describe('CacheAlertService', () => {
  let alertService: CacheAlertService
  
  beforeEach(() => {
    vi.clearAllMocks()
    alertService = new CacheAlertService()
  })

  describe('Cache Hit Rate Monitoring', () => {
    it('should detect low cache hit rate', async () => {
      // Mock low hit rate scenario
      const mockStats = {
        hitRate: 0.3, // 30% - below threshold
        totalRequests: 1000,
        cacheHits: 300
      }
      
      const alert = await alertService.checkHitRate(mockStats)
      
      expect(alert.severity).toBe('warning')
      expect(alert.message).toContain('low cache hit rate')
    })

    it('should not alert for healthy hit rate', async () => {
      const mockStats = {
        hitRate: 0.85, // 85% - healthy
        totalRequests: 1000,
        cacheHits: 850
      }
      
      const alert = await alertService.checkHitRate(mockStats)
      
      expect(alert).toBeNull()
    })
  })

  describe('Memory Usage Monitoring', () => {
    it('should alert on high memory usage', async () => {
      const mockMemoryStats = {
        used: 950 * 1024 * 1024, // 950MB
        total: 1024 * 1024 * 1024, // 1GB
        percentage: 92.8
      }
      
      const alert = await alertService.checkMemoryUsage(mockMemoryStats)
      
      expect(alert.severity).toBe('critical')
      expect(alert.message).toContain('high memory usage')
    })
  })
})
```

#### Criterio de Éxito Sprint 2:
- ✅ Coverage >= 50%
- ✅ Services críticos con 75%+ cobertura
- ✅ Tests de performance y concurrencia
- ✅ Mocking completo de dependencias

---

### **Sprint 3 (Semana 3): Controllers y Middleware**
**Objetivo**: 70% cobertura + controllers/middleware completados

#### Tests de Controllers:

**`src/test/controllers/cacheController.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import { cacheWarmingService } from '../services/CacheWarmingService'
import { cacheService } from '../services/CacheService'

// Mock services
vi.mock('../services/CacheWarmingService')
vi.mock('../services/CacheService')

// Mock auth middleware
vi.mock('../middleware/authMiddleware', () => ({
  protect: (req: any, res: any, next: any) => {
    req.user = { _id: 'testuser', role: 'admin' }
    next()
  },
  admin: (req: any, res: any, next: any) => next()
}))

describe('Cache Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/cache/warm', () => {
    it('should warm cache successfully', async () => {
      vi.mocked(cacheWarmingService.warmUpCriticalData).mockResolvedValue({
        success: true,
        duration: 1500,
        itemsWarmed: 25,
        errors: []
      })
      
      const response = await request(app)
        .post('/api/v1/cache/warm')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        message: 'Cache warming completed successfully',
        data: {
          duration: 1500,
          itemsWarmed: 25,
          errors: []
        }
      })
    })

    it('should handle warming errors', async () => {
      vi.mocked(cacheWarmingService.warmUpCriticalData).mockResolvedValue({
        success: false,
        duration: 800,
        itemsWarmed: 10,
        errors: ['Database connection failed']
      })
      
      const response = await request(app)
        .post('/api/v1/cache/warm')
        .expect(207) // Partial success
      
      expect(response.body.success).toBe(false)
      expect(response.body.data.errors).toHaveLength(1)
    })

    it('should require admin privileges', async () => {
      // Temporarily mock auth to return regular user
      const originalMock = vi.mocked(require('../middleware/authMiddleware').admin)
      vi.mocked(require('../middleware/authMiddleware').admin).mockImplementation(
        (req: any, res: any, next: any) => {
          res.status(403).json({ success: false, message: 'Admin access required' })
        }
      )
      
      await request(app)
        .post('/api/v1/cache/warm')
        .expect(403)
      
      // Restore original mock
      vi.mocked(require('../middleware/authMiddleware').admin).mockImplementation(originalMock)
    })
  })

  describe('GET /api/v1/cache/stats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        hitRate: 0.85,
        totalRequests: 10000,
        cacheHits: 8500,
        memoryUsage: {
          used: 512 * 1024 * 1024,
          total: 1024 * 1024 * 1024
        }
      }
      
      vi.mocked(cacheService.getStats).mockResolvedValue(mockStats)
      
      const response = await request(app)
        .get('/api/v1/cache/stats')
        .expect(200)
      
      expect(response.body.data).toEqual(mockStats)
    })
  })

  describe('DELETE /api/v1/cache/clear', () => {
    it('should clear cache successfully', async () => {
      vi.mocked(cacheService.clear).mockResolvedValue(true)
      
      const response = await request(app)
        .delete('/api/v1/cache/clear')
        .expect(200)
      
      expect(response.body.message).toContain('cleared successfully')
      expect(cacheService.clear).toHaveBeenCalled()
    })

    it('should handle clear cache errors', async () => {
      vi.mocked(cacheService.clear).mockRejectedValue(
        new Error('Redis connection failed')
      )
      
      const response = await request(app)
        .delete('/api/v1/cache/clear')
        .expect(500)
      
      expect(response.body.success).toBe(false)
    })
  })
})
```

#### Tests de Middleware Mejorados:

**`src/test/middleware/errorHandler.test.ts`** (Mejorado)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { errorHandler, notFound } from '../middleware/errorHandler'

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {}
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    mockNext = vi.fn()
  })

  describe('errorHandler', () => {
    it('should handle validation errors', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password is required' }
        }
      }

      errorHandler(validationError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          'Email is required',
          'Password is required'
        ])
      })
    })

    it('should handle CastError (invalid ObjectId)', () => {
      const castError = {
        name: 'CastError',
        path: '_id',
        value: 'invalid_id'
      }

      errorHandler(castError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid ID format'
      })
    })

    it('should handle duplicate key errors', () => {
      const duplicateError = {
        code: 11000,
        keyValue: { email: 'test@example.com' }
      }

      errorHandler(duplicateError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate field value entered'
      })
    })

    it('should handle JWT errors', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid token'
      }

      errorHandler(jwtError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token'
      })
    })

    it('should handle custom AppError', () => {
      const appError = {
        name: 'AppError',
        message: 'Custom application error',
        statusCode: 422,
        isOperational: true
      }

      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(422)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Custom application error'
      })
    })

    it('should handle generic errors in production', () => {
      process.env.NODE_ENV = 'production'
      
      const genericError = new Error('Database connection failed')

      errorHandler(genericError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Server Error'
      })
      
      process.env.NODE_ENV = 'test'
    })

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Test error')
      error.stack = 'Error stack trace'

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace'
        })
      )
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('notFound', () => {
    it('should handle 404 routes', () => {
      mockReq.originalUrl = '/api/v1/nonexistent'

      notFound(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route /api/v1/nonexistent not found'
      })
    })
  })
})
```

#### Criterio de Éxito Sprint 3:
- ✅ Coverage >= 70%
- ✅ Todos los controllers con tests
- ✅ Middleware con cobertura completa
- ✅ Tests de integración E2E

---

### **Sprint 4 (Semana 4): Optimización y Scripts**
**Objetivo**: 75% cobertura + optimización completa

#### Tests de Scripts:

**`src/test/scripts/seedData.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Import the seed functions
// Assuming seedData.ts exports these functions
import { 
  seedUsers, 
  seedRestaurants, 
  seedBusinesses,
  clearDatabase,
  runSeed 
} from '../scripts/seedData'

describe('Seed Data Scripts', () => {
  let mongoServer: MongoMemoryServer

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)
  })

  afterEach(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  describe('seedUsers', () => {
    it('should create test users successfully', async () => {
      const result = await seedUsers()
      
      expect(result.success).toBe(true)
      expect(result.created).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle duplicate users gracefully', async () => {
      // Run seed twice
      await seedUsers()
      const secondResult = await seedUsers()
      
      // Should handle duplicates without failing
      expect(secondResult.success).toBe(true)
    })
  })

  describe('clearDatabase', () => {
    it('should clear all collections', async () => {
      // First add some data
      await seedUsers()
      await seedRestaurants()
      
      const result = await clearDatabase()
      
      expect(result.success).toBe(true)
      expect(result.collectionsCleared).toBeGreaterThan(0)
    })
  })

  describe('runSeed', () => {
    it('should run complete seed process', async () => {
      const result = await runSeed()
      
      expect(result.success).toBe(true)
      expect(result.totalCreated).toBeGreaterThan(0)
      expect(result.duration).toBeGreaterThan(0)
    })
  })
})
```

#### Tests de Performance:

**`src/test/performance/cachePerformance.test.ts`**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { performance } from 'perf_hooks'
import { cacheService } from '../services/CacheService'

describe('Cache Performance Tests', () => {
  it('should handle concurrent cache operations', async () => {
    const startTime = performance.now()
    
    // Simulate 100 concurrent cache operations
    const promises = Array.from({ length: 100 }, (_, i) => 
      cacheService.set(`test-key-${i}`, `value-${i}`, 'performance-test')
    )
    
    await Promise.all(promises)
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time (2 seconds)
    expect(duration).toBeLessThan(2000)
  })

  it('should handle large data caching efficiently', async () => {
    const largeData = {
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'A'.repeat(100) // 100 char description
      }))
    }
    
    const startTime = performance.now()
    
    await cacheService.set('large-data', largeData, 'performance-test')
    const retrieved = await cacheService.get('large-data', 'performance-test')
    
    const endTime = performance.now()
    
    expect(retrieved).toEqual(largeData)
    expect(endTime - startTime).toBeLessThan(1000) // 1 second
  })
})
```

#### Criterio de Éxito Sprint 4:
- ✅ Coverage >= 75%
- ✅ Scripts de seed con tests completos
- ✅ Tests de performance incluidos
- ✅ Documentación completa
- ✅ CI/CD optimizado

---

## 📊 **FASE 4: Coverage Thresholds Progresivos**

### Configuración Gradual por Sprints:

```typescript
// vitest.config.ts - Configuración dinámica
const getThresholds = () => {
  const sprint = process.env.CURRENT_SPRINT || '1'
  
  const thresholds = {
    '1': { // Sprint 1: Base
      global: { branches: 30, functions: 30, lines: 30, statements: 30 }
    },
    '2': { // Sprint 2: Incremento
      global: { branches: 50, functions: 50, lines: 50, statements: 50 }
    },
    '3': { // Sprint 3: Objetivo
      global: { branches: 70, functions: 70, lines: 70, statements: 70 }
    },
    '4': { // Sprint 4: Optimización
      global: { branches: 75, functions: 75, lines: 75, statements: 75 }
    }
  }
  
  return thresholds[sprint] || thresholds['4']
}

export default defineConfig({
  test: {
    coverage: {
      thresholds: getThresholds()
    }
  }
})
```

### Scripts de Verificación:

**`scripts/check-coverage.sh`**
```bash
#!/bin/bash

echo "📊 Checking coverage for Sprint $CURRENT_SPRINT..."

# Run tests with coverage
npm run test:coverage

# Extract coverage percentage
COVERAGE=$(npm run test:coverage 2>/dev/null | grep "All files" | awk '{print $4}' | tr -d '%')

# Define thresholds by sprint
case $CURRENT_SPRINT in
  1) THRESHOLD=30 ;;
  2) THRESHOLD=50 ;;
  3) THRESHOLD=70 ;;
  4) THRESHOLD=75 ;;
  *) THRESHOLD=70 ;;
esac

echo "Current coverage: ${COVERAGE}%"
echo "Required for Sprint $CURRENT_SPRINT: ${THRESHOLD}%"

if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
    echo "✅ Coverage goal achieved!"
    exit 0
else
    echo "❌ Coverage below threshold. Need $(echo "$THRESHOLD - $COVERAGE" | bc)% more"
    exit 1
fi
```

---

## 🛠️ **FASE 5: Scripts de Automatización**

### Script de Migración Completa:

**`scripts/migrate-to-vitest.sh`**
```bash
#!/bin/bash
set -e

echo "🔄 Starting Jest to Vitest migration..."

# 1. Backup current configuration
echo "📁 Creating backups..."
cp package.json package.json.backup
cp jest.config.js jest.config.js.backup 2>/dev/null || true
cp jest.config.base.js jest.config.base.js.backup 2>/dev/null || true

# 2. Remove Jest dependencies
echo "🗑️ Removing Jest dependencies..."
npm uninstall jest @types/jest ts-jest c8

# 3. Install Vitest
echo "📦 Installing Vitest..."
npm install -D vitest @vitest/coverage-v8 @vitest/ui

# 4. Create Vitest configuration
echo "⚙️ Creating vitest.config.ts..."
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts', 
        'src/types/**',
        'src/node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
EOF

# 5. Update package.json scripts
echo "📝 Updating package.json scripts..."
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:run="vitest run"
npm pkg set scripts.test:coverage="vitest run --coverage"
npm pkg set scripts.test:ui="vitest --ui"
npm pkg set scripts.test:watch="vitest --watch"
npm pkg set scripts.test:ci="vitest run --coverage --reporter=verbose"

# 6. Remove old Jest config files
echo "🧹 Cleaning up old configuration..."
rm -f jest.config.js jest.config.base.js jest.config.integration.js jest.config.isolated.js

# 7. Update tsconfig.test.json for Vitest
echo "📝 Updating TypeScript configuration..."
cat > tsconfig.test.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "node", "@types/supertest"]
  },
  "include": ["src/**/*", "src/test/**/*"]
}
EOF

# 8. Run initial test to verify migration
echo "🧪 Running initial tests..."
npm run test:run

echo "✅ Migration completed successfully!"
echo "🎯 Next steps:"
echo "  1. Review and run: npm run test:coverage"
echo "  2. Start implementing missing tests"
echo "  3. Use: npm run test:ui for interactive testing"
```

### Script de Generación de Tests:

**`scripts/generate-missing-tests.sh`**
```bash
#!/bin/bash

echo "🏗️ Generating missing test files..."

# Define directories and files that need tests
declare -a MISSING_TESTS=(
    "src/server.ts:src/test/server.test.ts"
    "src/config/db.ts:src/test/config/db.test.ts"
    "src/controllers/cacheController.ts:src/test/controllers/cacheController.test.ts"
    "src/scripts/seedData.ts:src/test/scripts/seedData.test.ts"
    "src/scripts/checkData.ts:src/test/scripts/checkData.test.ts"
)

for mapping in "${MISSING_TESTS[@]}"; do
    IFS=':' read -r source_file test_file <<< "$mapping"
    
    if [[ -f "$source_file" && ! -f "$test_file" ]]; then
        echo "📝 Creating $test_file..."
        
        # Create directory if it doesn't exist
        mkdir -p "$(dirname "$test_file")"
        
        # Generate basic test template
        cat > "$test_file" << EOF
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('$(basename "$source_file" .ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic functionality', () => {
    it('should be implemented', () => {
      // TODO: Implement test
      expect(true).toBe(true)
    })
  })

  // TODO: Add more specific tests based on the module functionality
})
EOF
        
        echo "✅ Created $test_file"
    else
        echo "⏭️ Skipping $test_file (source missing or test exists)"
    fi
done

echo "🎯 Generated missing test files. Remember to implement the actual tests!"
```

### Script de CI/CD Actualizado:

**`.github/workflows/test-coverage.yml`**
```yaml
name: Test Coverage

on:
  push:
    branches: [ main, development ]
  pull_request:
    branches: [ main, development ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests with coverage
      run: npm run test:ci

    - name: Check coverage thresholds
      run: |
        COVERAGE=$(npm run test:coverage 2>/dev/null | grep "All files" | awk '{print $4}' | tr -d '%')
        echo "Coverage: ${COVERAGE}%"
        if (( $(echo "$COVERAGE < 70" | bc -l) )); then
          echo "❌ Coverage below 70%"
          exit 1
        fi

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        fail_ci_if_error: true

    - name: Comment coverage on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const coverage = fs.readFileSync('./coverage/coverage-summary.json', 'utf8');
          const { total } = JSON.parse(coverage);
          
          const comment = `
          ## 📊 Test Coverage Report
          
          | Metric | Coverage | Status |
          |--------|----------|--------|
          | Lines | ${total.lines.pct}% | ${total.lines.pct >= 70 ? '✅' : '❌'} |
          | Functions | ${total.functions.pct}% | ${total.functions.pct >= 70 ? '✅' : '❌'} |
          | Branches | ${total.branches.pct}% | ${total.branches.pct >= 70 ? '✅' : '❌'} |
          | Statements | ${total.statements.pct}% | ${total.statements.pct >= 70 ? '✅' : '❌'} |
          
          Minimum required: 70%
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

---

## 📋 **FASE 6: Checklist de Implementación**

### ✅ **Sprint 1 - Migración Base (Semana 1)**
- [ ] **Preparación**
  - [ ] Backup de configuración Jest actual
  - [ ] Documentar tests existentes que funcionan
  - [ ] Verificar dependencias del proyecto

- [ ] **Migración Técnica**
  - [ ] Desinstalar Jest: `npm uninstall jest @types/jest ts-jest c8`
  - [ ] Instalar Vitest: `npm install -D vitest @vitest/coverage-v8 @vitest/ui`
  - [ ] Crear `vitest.config.ts` con configuración optimizada
  - [ ] Actualizar scripts en `package.json`
  - [ ] Migrar `tsconfig.test.json`

- [ ] **Tests Críticos del Core**
  - [ ] `src/test/server.test.ts` - Tests de servidor y startup
  - [ ] `src/test/app.test.ts` - Tests de aplicación Express
  - [ ] `src/test/config/db.test.ts` - Tests de conexión MongoDB
  - [ ] Verificar que tests existentes funcionan con Vitest

- [ ] **Verificación Sprint 1**
  - [ ] Ejecutar `npm run test:coverage`
  - [ ] Coverage >= 30%
  - [ ] CI/CD pipeline actualizado
  - [ ] No tests rompiendo

### ✅ **Sprint 2 - Services Críticos (Semana 2)**
- [ ] **CacheWarmingService (14.09% → 75%+)**
  - [ ] Tests de `warmUpCriticalData()`
  - [ ] Tests de `startAutoWarming()` y `stopAutoWarming()`
  - [ ] Tests de `warmSpecificData()`
  - [ ] Tests de manejo de errores y concurrencia
  - [ ] Tests de performance y timeouts

- [ ] **CacheAlertService (38.09% → 75%+)**
  - [ ] Tests de monitoreo de hit rate
  - [ ] Tests de alertas de memoria
  - [ ] Tests de notificaciones
  - [ ] Tests de thresholds configurables

- [ ] **PostService (36.36% → 75%+)**
  - [ ] Tests de CRUD operations
  - [ ] Tests de like/unlike functionality
  - [ ] Tests de comentarios
  - [ ] Tests de validaciones y edge cases

- [ ] **ReviewService (25.27% → 75%+)**
  - [ ] Tests de creación y validación de reviews
  - [ ] Tests de agregaciones y ratings
  - [ ] Tests de moderación
  - [ ] Tests de filtros y búsquedas

- [ ] **Verificación Sprint 2**
  - [ ] Coverage >= 50%
  - [ ] Services críticos con 75%+ individual
  - [ ] Tests de integración entre services
  - [ ] Mocking completo de dependencias

### ✅ **Sprint 3 - Controllers y Middleware (Semana 3)**
- [ ] **Controllers Faltantes**
  - [ ] `src/test/controllers/cacheController.test.ts`
  - [ ] Mejorar controllers existentes con baja cobertura
  - [ ] Tests de autenticación y autorización
  - [ ] Tests de validación de input
  - [ ] Tests de manejo de errores HTTP

- [ ] **Middleware Crítico (26.17% → 75%+)**
  - [ ] `src/test/middleware/cache.test.ts` - Mejorado
  - [ ] `src/test/middleware/errorHandler.test.ts` - Completo
  - [ ] Tests de `authMiddleware` edge cases
  - [ ] Tests de `validation` middleware
  - [ ] Tests de `security` middleware

- [ ] **Tests de Integración E2E**
  - [ ] Flujos completos de autenticación
  - [ ] Tests de cache warming end-to-end
  - [ ] Tests de performance de API
  - [ ] Tests de rate limiting

- [ ] **Verificación Sprint 3**
  - [ ] Coverage >= 70% ✅ OBJETIVO PRINCIPAL
  - [ ] Todos los controllers con tests
  - [ ] Middleware con cobertura completa
  - [ ] Tests E2E funcionando

### ✅ **Sprint 4 - Optimización (Semana 4)**
- [ ] **Scripts sin Tests (0% → 75%+)**
  - [ ] `src/test/scripts/seedData.test.ts`
  - [ ] `src/test/scripts/checkData.test.ts`
  - [ ] `src/test/scripts/cacheMonitor.test.ts`
  - [ ] Tests de scripts de deployment

- [ ] **Tests de Performance**
  - [ ] Tests de carga de cache
  - [ ] Tests de concurrencia
  - [ ] Tests de memory leaks
  - [ ] Benchmarks de endpoints críticos

- [ ] **Optimización y Documentación**
  - [ ] Refactor de tests lentos
  - [ ] Configuración de test paralelos
  - [ ] Documentación de testing guidelines
  - [ ] Setup de pre-commit hooks

- [ ] **Verificación Sprint 4**
  - [ ] Coverage >= 75% 🎯 EXCELENCIA
  - [ ] Scripts críticos con tests
  - [ ] Performance tests incluidos
  - [ ] Documentación completa

---

## 📊 **Métricas de Éxito por Sprint**

| Sprint | Cobertura Objetivo | Archivos Nuevos | Enfoque Principal |
|--------|-------------------|-----------------|-------------------|
| **Sprint 1** | 30%+ | ~3-5 tests | Migración + Core |
| **Sprint 2** | 50%+ | ~8-10 tests | Services Críticos |
| **Sprint 3** | **70%+** | ~10-12 tests | Controllers + Middleware |
| **Sprint 4** | 75%+ | ~5-8 tests | Scripts + Optimización |

## 🎯 **Resultados Esperados Finales**

### Cobertura por Módulo (Objetivo Final):
- **Controllers**: 45.89% → 75%+
- **Services**: 49.86% → 75%+
- **Middleware**: 48.66% → 75%+
- **Routes**: 70% → 80%+
- **Models**: 100% (mantener)
- **Utils**: 92.41% (mantener)

### Beneficios de la Migración:
- ⚡ **Performance**: Tests 2-3x más rápidos con Vitest
- 🎯 **Coverage**: De 53.94% a 75%+
- 🔧 **DX**: Mejor experiencia de desarrollo
- 🚀 **CI/CD**: Pipeline más eficiente
- 📊 **Reporting**: Mejor visualización de coverage

### Tiempo Total Estimado: **3-4 semanas**
### Esfuerzo: **~25-30 archivos de test nuevos**
### ROI: **Alto** - Mejor calidad, menos bugs, deploy más seguro