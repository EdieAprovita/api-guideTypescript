/**
 * TokenService Tests - Using Simple Mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { simpleMocks, resetAllMocks } from '../__mocks__/simple-mocks';

// Create a map to store tokens for consistent mocking
const tokenStorage = new Map<string, string>();

// Mock Redis with proper token storage simulation
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    setex: vi.fn().mockImplementation((key: string, _ttl: number, value: string) => {
      tokenStorage.set(key, value);
      return Promise.resolve('OK');
    }),
    get: vi.fn().mockImplementation((key: string) => {
      const value = tokenStorage.get(key);
      return Promise.resolve(value || null);
    }),
    del: vi.fn().mockImplementation((key: string) => {
      const existed = tokenStorage.has(key);
      tokenStorage.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
    keys: vi.fn().mockResolvedValue([]),
    ttl: vi.fn().mockResolvedValue(-1),
    disconnect: vi.fn().mockResolvedValue(undefined),
    flushall: vi.fn().mockImplementation(() => {
      tokenStorage.clear();
      return Promise.resolve('OK');
    })
  }))
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn((payload: Record<string, unknown>) => {
    const baseToken = `mock-token-${payload.userId}`;
    return payload.type === 'refresh' ? `${baseToken}-refresh` : baseToken;
  }),
  verify: vi.fn((token: string) => {
    const isRefreshToken = token.includes('refresh');
    const basePayload = {
      userId: 'mock-user-id',
      email: 'test@example.com',
      role: 'user'
    };
    
    if (isRefreshToken) {
      return {
        ...basePayload,
        type: 'refresh'
      };
    }
    
    return basePayload;
  }),
  decode: vi.fn(() => ({ 
    userId: 'mock-user-id',
    exp: Math.floor(Date.now() / 1000) + 3600
  }))
}));

// Set required env vars
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('TokenService - Simple Tests', () => {
  let TokenService: typeof import('../../services/TokenService').default;

  beforeEach(async () => {
    resetAllMocks();
    // Dynamic import to get fresh instance
    const module = await import('../../services/TokenService');
    TokenService = module.default;
  });

  describe('Token Generation', () => {
    it('should generate token pair', async () => {
      const result = await TokenService.generateTokens('user-id', 'test@example.com', 'user');
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should generate tokens with minimal parameters', async () => {
      const result = await TokenService.generateTokens('user-id');
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('Token Verification', () => {
    it('should verify access token', async () => {
      const result = await TokenService.verifyAccessToken('mock-access-token');
      
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
    });

    it('should verify refresh token', async () => {
      // First generate a token pair to store the refresh token
      const tokenPair = await TokenService.generateTokens('mock-user-id', 'test@example.com', 'user');
      
      // Now verify the refresh token
      const result = await TokenService.verifyRefreshToken(tokenPair.refreshToken);
      
      expect(result).toHaveProperty('userId', 'mock-user-id');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('role', 'user');
      expect(result).toHaveProperty('type', 'refresh');
    });
  });

  describe('Token Management', () => {
    it('should blacklist token', async () => {
      await expect(TokenService.blacklistToken('mock-token')).resolves.toBeUndefined();
    });

    it('should check if token is blacklisted', async () => {
      const result = await TokenService.isTokenBlacklisted('mock-token');
      expect(typeof result).toBe('boolean');
    });

    it('should disconnect cleanly', async () => {
      await expect(TokenService.disconnect()).resolves.toBeUndefined();
    });

    it('should clear all for testing', async () => {
      await expect(TokenService.clearAllForTesting()).resolves.toBeUndefined();
    });
  });
});