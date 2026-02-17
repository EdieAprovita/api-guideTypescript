import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cacheRoutes from '../../routes/cacheRoutes.js'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/cache', cacheRoutes)

// Mock dependencies
vi.mock('../../middleware/authMiddleware', () => ({
  protect: (req: Request, res: Response, next: NextFunction) => {
    req.user = { _id: 'testuser', role: 'admin' }
    next()
  },
  admin: (req: Request, res: Response, next: NextFunction) => next()
}))

vi.mock('../../services/CacheService', () => ({
  cacheService: {
    getStats: vi.fn(),
    flush: vi.fn(),
    invalidatePattern: vi.fn(),
    invalidateByTag: vi.fn()
  }
}))

vi.mock('../../scripts/cacheMonitor', () => ({
  cacheMonitor: {
    getCurrentPerformance: vi.fn(),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn()
  }
}))

vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('Cache Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/cache/stats', () => {
    it('should return cache statistics successfully', async () => {
      const mockStats = {
        hitRatio: 0.85,
        totalRequests: 1000,
        cacheSize: 50
      }
      const mockPerformance = {
        avgResponseTime: 120,
        throughput: 800
      }

      const { cacheService } = await import('../../services/CacheService')
      const { cacheMonitor } = await import('../../scripts/cacheMonitor')
      
      vi.mocked(cacheService.getStats).mockResolvedValue(mockStats)
      vi.mocked(cacheMonitor.getCurrentPerformance).mockResolvedValue(mockPerformance)

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.stats).toEqual(mockStats)
      expect(response.body.data.performance).toEqual(mockPerformance)
      expect(response.body.data.timestamp).toBeDefined()
    })

    it('should handle errors when getting stats', async () => {
      const { cacheService } = await import('../../services/CacheService')
      vi.mocked(cacheService.getStats).mockRejectedValue(new Error('Cache error'))

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to get cache statistics')
    })
  })

  describe('DELETE /api/cache/flush', () => {
    it('should flush cache successfully', async () => {
      const { cacheService } = await import('../../services/CacheService')
      vi.mocked(cacheService.flush).mockResolvedValue(undefined)

      const response = await request(app)
        .delete('/api/cache/flush')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Cache flushed successfully')
      expect(cacheService.flush).toHaveBeenCalled()
    })

    it('should handle flush errors', async () => {
      const { cacheService } = await import('../../services/CacheService')
      vi.mocked(cacheService.flush).mockRejectedValue(new Error('Flush failed'))

      const response = await request(app)
        .delete('/api/cache/flush')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to flush cache')
    })
  })

  describe('DELETE /api/cache/invalidate/:pattern', () => {
    it('should invalidate cache pattern successfully', async () => {
      const { cacheService } = await import('../../services/CacheService')
      vi.mocked(cacheService.invalidatePattern).mockResolvedValue(undefined)

      const pattern = 'user:*'
      const response = await request(app)
        .delete(`/api/cache/invalidate/${pattern}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain(pattern)
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(pattern)
    })

    it('should return error for missing pattern', async () => {
      const response = await request(app)
        .delete('/api/cache/invalidate/')
        .expect(404) // Express returns 404 for missing route param
    })
  })

  describe('DELETE /api/cache/invalidate-tag/:tag', () => {
    it('should invalidate cache by tag successfully', async () => {
      const { cacheService } = await import('../../services/CacheService')
      vi.mocked(cacheService.invalidateByTag).mockResolvedValue(undefined)

      const tag = 'users'
      const response = await request(app)
        .delete(`/api/cache/invalidate-tag/${tag}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain(tag)
      expect(cacheService.invalidateByTag).toHaveBeenCalledWith(tag)
    })
  })

  describe('GET /api/cache/health', () => {
    it('should return healthy status', async () => {
      const { cacheService } = await import('../../services/CacheService')
      const mockStats = {
        hitRatio: 0.5,
        totalRequests: 1000,
        cacheSize: 50,
        memoryUsage: 1024,
        uptime: 3600
      }
      vi.mocked(cacheService.getStats).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('healthy')
      expect(response.body.data.hitRatio).toBe(0.5)
    })

    it('should return unhealthy status for low hit ratio', async () => {
      const { cacheService } = await import('../../services/CacheService')
      const mockStats = {
        hitRatio: 0.05, // Below 10% threshold
        totalRequests: 1000,
        cacheSize: 50,
        memoryUsage: 1024,
        uptime: 3600
      }
      vi.mocked(cacheService.getStats).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('unhealthy')
    })
  })

  describe('POST /api/cache/monitor/:action', () => {
    it('should start monitoring successfully', async () => {
      const { cacheMonitor } = await import('../../scripts/cacheMonitor')
      vi.mocked(cacheMonitor.startMonitoring).mockReturnValue(undefined)

      const response = await request(app)
        .post('/api/cache/monitor/start')
        .send({ interval: 10 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Cache monitoring started')
      expect(cacheMonitor.startMonitoring).toHaveBeenCalledWith(10)
    })

    it('should stop monitoring successfully', async () => {
      const { cacheMonitor } = await import('../../scripts/cacheMonitor')
      vi.mocked(cacheMonitor.stopMonitoring).mockReturnValue(undefined)

      const response = await request(app)
        .post('/api/cache/monitor/stop')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Cache monitoring stopped')
      expect(cacheMonitor.stopMonitoring).toHaveBeenCalled()
    })

    it('should handle invalid action', async () => {
      const response = await request(app)
        .post('/api/cache/monitor/invalid')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Invalid action. Use "start" or "stop"')
    })
  })
})