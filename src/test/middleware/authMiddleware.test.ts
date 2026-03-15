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

import { protect, logout } from '../../middleware/authMiddleware.js';
import TokenService from '../../services/TokenService.js';
import { User } from '../../models/User.js';

// ---------------------------------------------------------------------------
// Shared factories
// ---------------------------------------------------------------------------

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

/** Standard Bearer-token request used by most protect() tests. */
async function runProtect(userOverrides: Record<string, unknown> = {}) {
    mockUserLookup({
        _id: 'user123',
        email: 'test@example.com',
        role: 'user',
        ...userOverrides,
    });

    const { req, res, next } = createMocks({
        headers: { authorization: 'Bearer valid-token' } as any,
    });

    await protect(req, res, next);
    return { req, res, next };
}

/** Assert next() was called once with an HttpError at the given status code. */
function expectNextHttpError(next: NextFunction, status: HttpStatusCode) {
    expect(next).toHaveBeenCalledOnce();
    const err = vi.mocked(next).mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.statusCode).toBe(status);
    return err;
}

// ---------------------------------------------------------------------------
// protect() — validateUserAccount (isDeleted / isActive)
// ---------------------------------------------------------------------------

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
        const { next } = await runProtect({ isActive: true, isDeleted: true });

        const err = expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toContain('inactive');
    });

    it('should DENY access when isDeleted=false and isActive=false (regression: ?? vs ||)', async () => {
        // CRITICAL REGRESSION TEST
        // With the old `??` operator: isDeleted=false is not null/undefined,
        // so ?? would short-circuit to `false`, skipping the !isActive check.
        // With `||`: isDeleted=false evaluates to false, so !isActive=true is checked → denied.
        const { next } = await runProtect({ isActive: false, isDeleted: false });

        const err = expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toContain('inactive');
    });

    it('should ALLOW access when isDeleted=false and isActive=true', async () => {
        const { req, next } = await runProtect({ isActive: true, isDeleted: false });

        // next() called without error — user passes validation
        expect(next).toHaveBeenCalledOnce();
        expect(vi.mocked(next).mock.calls[0][0]).toBeUndefined();
        expect(req.user).toBeDefined();
    });

    it('should DENY access when isDeleted=true and isActive=false', async () => {
        const { next } = await runProtect({ isActive: false, isDeleted: true });

        expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
    });

    it('should return 503 when Redis is unavailable during token revocation check', async () => {
        vi.mocked(TokenService.isUserTokensRevoked).mockRejectedValue(new Error('Redis connection refused'));

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        const err = expectNextHttpError(next, HttpStatusCode.SERVICE_UNAVAILABLE);
        expect(err.message).toContain('temporarily unavailable');
    });
});

// ---------------------------------------------------------------------------
// logout() — error path
// ---------------------------------------------------------------------------

describe('authMiddleware — logout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('should call next(error) when blacklistToken rejects', async () => {
        const blacklistError = new Error('Redis write failed');
        vi.mocked(TokenService.blacklistToken).mockRejectedValue(blacklistError);

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer some-token' } as any,
        });

        await logout(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0];
        expect(err).toBeInstanceOf(Error);
        expect(err).toBe(blacklistError); // Error instances should be forwarded directly
    });

    it('should wrap non-Error throws in HttpError for logout', async () => {
        vi.mocked(TokenService.blacklistToken).mockRejectedValueOnce('redis unavailable');

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer some-token' } as any,
        });

        await logout(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0];
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    });
});
