import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';

// Save original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Mock dependencies before importing the module under test
vi.mock('../../models/User', () => ({
    User: {
        findById: vi.fn(),
    },
}));

vi.mock('../../services/TokenService', () => ({
    default: {
        verifyAccessToken: vi.fn(),
        isUserTokensRevoked: vi.fn(),
        blacklistToken: vi.fn(),
    },
}));

vi.mock('../../utils/logger', () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

import { protect } from '../../middleware/authMiddleware.js';
import TokenService from '../../services/TokenService.js';
import { User } from '../../models/User.js';

// Helper to create mock request/response/next
function createMocks(overrides: Partial<Request> = {}) {
    const req = {
        cookies: {},
        headers: {},
        ...overrides,
    } as unknown as Request;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        clearCookie: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
}

function mockUserLookup(userData: Record<string, unknown>) {
    vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(userData),
        }),
    } as any);
}

describe('authMiddleware — validateUserAccount (isDeleted / isActive)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Force non-test env so protect() runs validateUserAccount
        // instead of short-circuiting via handleTestEnvironment
        process.env.NODE_ENV = 'development';

        // Default: token is valid, user tokens not revoked
        vi.mocked(TokenService.verifyAccessToken).mockResolvedValue({
            userId: 'user123',
            email: 'test@example.com',
        });
        vi.mocked(TokenService.isUserTokensRevoked).mockResolvedValue(false);
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('should DENY access when isDeleted=true and isActive=true', async () => {
        mockUserLookup({
            _id: 'user123',
            email: 'test@example.com',
            role: 'user',
            isActive: true,
            isDeleted: true,
        });

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0] as HttpError;
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toContain('inactive');
    });

    it('should DENY access when isDeleted=false and isActive=false (regression: ?? vs ||)', async () => {
        // CRITICAL REGRESSION TEST
        // With the old `??` operator: isDeleted=false is not null/undefined,
        // so ?? would short-circuit to `false`, skipping the !isActive check.
        // With `||`: isDeleted=false evaluates to false, so !isActive=true is checked → denied.
        mockUserLookup({
            _id: 'user123',
            email: 'test@example.com',
            role: 'user',
            isActive: false,
            isDeleted: false,
        });

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0] as HttpError;
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toContain('inactive');
    });

    it('should ALLOW access when isDeleted=false and isActive=true', async () => {
        mockUserLookup({
            _id: 'user123',
            email: 'test@example.com',
            role: 'user',
            isActive: true,
            isDeleted: false,
        });

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        // next() called without error — user passes validation
        expect(next).toHaveBeenCalledOnce();
        expect(vi.mocked(next).mock.calls[0][0]).toBeUndefined();
        expect(req.user).toBeDefined();
    });

    it('should DENY access when isDeleted=true and isActive=false', async () => {
        mockUserLookup({
            _id: 'user123',
            email: 'test@example.com',
            role: 'user',
            isActive: false,
            isDeleted: true,
        });

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0] as HttpError;
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
    });

    it('should return 503 when Redis is unavailable during token revocation check', async () => {
        vi.mocked(TokenService.isUserTokensRevoked).mockRejectedValue(new Error('Redis connection refused'));

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0] as HttpError;
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(HttpStatusCode.SERVICE_UNAVAILABLE);
        expect(err.message).toContain('temporarily unavailable');
    });
});
