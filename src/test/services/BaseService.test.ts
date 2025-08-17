import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'

// Mock the dependencies
vi.mock('../../types/modalTypes', () => ({
  getErrorMessage: vi.fn((msg: string) => msg)
}))

vi.mock('../../services/CacheService', () => ({
  cacheService: vi.fn()
}))

vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('BaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ObjectId utilities', () => {
    it('should create ObjectId from valid string', () => {
      const validId = new Types.ObjectId().toString()
      const objectId = new Types.ObjectId(validId)
      
      expect(objectId).toBeInstanceOf(Types.ObjectId)
      expect(objectId.toString()).toBe(validId)
    })

    it('should create new ObjectId', () => {
      const objectId = new Types.ObjectId()
      expect(objectId).toBeInstanceOf(Types.ObjectId)
      expect(typeof objectId.toString()).toBe('string')
      expect(objectId.toString().length).toBeGreaterThan(0)
    })
  })

  describe('Basic functionality', () => {
    it('should import BaseService correctly', async () => {
      const BaseService = (await import('../../services/BaseService')).default
      expect(BaseService).toBeDefined()
      expect(typeof BaseService).toBe('function')
    })
  })
})