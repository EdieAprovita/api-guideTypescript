import { vi, describe, it, expect, beforeEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key';

// Mock jsonwebtoken module
vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
        decode: vi.fn(),
    },
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn(),
}));

// Mock Redis/IORedis
vi.mock('ioredis', () => {
    return {
        default: vi.fn(() => ({
            setex: vi.fn(),
            get: vi.fn(),
            del: vi.fn(),
            disconnect: vi.fn(),
        })),
    };
});

describe('TokenService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should be able to import TokenService', async () => {
        const { default: TokenService } = await import('../../services/TokenService');
        expect(TokenService).toBeDefined();
    });

    it('should have required environment variables', () => {
        expect(process.env.JWT_SECRET).toBe('test_jwt_secret_key');
        expect(process.env.JWT_REFRESH_SECRET).toBe('test_refresh_secret_key');
    });
});