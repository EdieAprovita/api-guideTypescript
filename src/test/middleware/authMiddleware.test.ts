import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode, TokenRevokedError } from '../../types/Errors.js';

// Save original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;
const originalRedisHost = process.env.REDIS_HOST;
const originalRedisUrl = process.env.REDIS_URL;

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

import { protect, logout, requireAuth, admin, professional, checkOwnership } from '../../middleware/authMiddleware.js';
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
        isDeleted: false,
        isActive: true,
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
        process.env.REDIS_HOST = 'mock-redis';
        delete process.env.REDIS_URL;

        // Default: token is valid, user tokens not revoked
        vi.mocked(TokenService.verifyAccessToken).mockResolvedValue({
            userId: 'user123',
            email: 'test@example.com',
        });
        vi.mocked(TokenService.isUserTokensRevoked).mockResolvedValue(false);
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalRedisHost === undefined) {
            delete process.env.REDIS_HOST;
        } else {
            process.env.REDIS_HOST = originalRedisHost;
        }
        if (originalRedisUrl === undefined) {
            delete process.env.REDIS_URL;
        } else {
            process.env.REDIS_URL = originalRedisUrl;
        }
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

    it('should skip token revocation check when Redis is not configured', async () => {
        process.env.REDIS_HOST = 'localhost';
        delete process.env.REDIS_URL;
        vi.mocked(TokenService.isUserTokensRevoked).mockRejectedValue(new Error('should not call Redis'));

        const { req, next } = await runProtect({ isActive: true, isDeleted: false });

        expect(TokenService.isUserTokensRevoked).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledOnce();
        expect(vi.mocked(next).mock.calls[0][0]).toBeUndefined();
        expect(req.user).toBeDefined();
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

    it('should call next() without error and clear the jwt cookie on successful logout', async () => {
        vi.mocked(TokenService.blacklistToken).mockResolvedValueOnce(undefined);

        const { req, res, next } = createMocks({
            cookies: { jwt: 'valid-token' },
        });

        await logout(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(); // no arguments = success
        expect(res.clearCookie).toHaveBeenCalledWith(
            'jwt',
            expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
        );
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

// ---------------------------------------------------------------------------
// protect() — missing / invalid token paths (401)
// ---------------------------------------------------------------------------

describe('authMiddleware — protect() token extraction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('should call next(HttpError 401) when no token is present (no cookie, no Authorization header)', async () => {
        const { req, res, next } = createMocks(); // empty cookies and headers

        await protect(req, res, next);

        const err = expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toMatch(/not authorized/i);
    });

    it('should call next(HttpError 401) when the Authorization header has no Bearer prefix', async () => {
        const { req, res, next } = createMocks({
            headers: { authorization: 'Token some-non-bearer-token' } as any,
        });

        await protect(req, res, next);

        expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
    });

    it('should call next(HttpError 401) when the token is invalid/expired', async () => {
        vi.mocked(TokenService.verifyAccessToken).mockRejectedValueOnce(new Error('jwt expired'));

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer expired-token' } as any,
        });

        await protect(req, res, next);

        const err = expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toMatch(/invalid or expired/i);
    });

    it('should call next(HttpError 401) when verifyAccessToken returns a falsy payload', async () => {
        // Some JWT libraries can resolve with null for malformed tokens
        vi.mocked(TokenService.verifyAccessToken).mockResolvedValueOnce(
            null as unknown as { userId: string; email: string }
        );

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer malformed-token' } as any,
        });

        await protect(req, res, next);

        expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
    });

    it('should extract the token from the jwt cookie when no Authorization header is set', async () => {
        vi.mocked(TokenService.verifyAccessToken).mockResolvedValueOnce({
            userId: 'user123',
            email: 'cookie@example.com',
        });
        vi.mocked(TokenService.isUserTokensRevoked).mockResolvedValueOnce(false);
        mockUserLookup({ _id: 'user123', email: 'cookie@example.com', role: 'user', isActive: true, isDeleted: false });

        const { req, res, next } = createMocks({ cookies: { jwt: 'valid-cookie-token' } });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(vi.mocked(next).mock.calls[0][0]).toBeUndefined();
        expect(vi.mocked(TokenService.verifyAccessToken)).toHaveBeenCalledWith('valid-cookie-token');
    });

    it('should propagate TokenRevokedError when verifyAccessToken rejects with one', async () => {
        vi.mocked(TokenService.verifyAccessToken).mockRejectedValueOnce(new TokenRevokedError());

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer revoked-token' } as any,
        });

        await protect(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = vi.mocked(next).mock.calls[0][0];
        // Implementation re-throws TokenRevokedError directly (not wrapped in HttpError)
        expect(err).toBeInstanceOf(TokenRevokedError);
    });

    it('should call next(HttpError 401) when user is not found in DB after token verification', async () => {
        vi.mocked(TokenService.verifyAccessToken).mockResolvedValueOnce({
            userId: 'ghost-user',
            email: 'ghost@example.com',
        });
        vi.mocked(TokenService.isUserTokensRevoked).mockResolvedValueOnce(false);
        // User.findById returns null — user was deleted from DB
        vi.mocked(User.findById).mockReturnValue({
            select: vi.fn().mockReturnValue({
                exec: vi.fn().mockResolvedValue(null),
            }),
        } as any);

        const { req, res, next } = createMocks({
            headers: { authorization: 'Bearer valid-token' } as any,
        });

        await protect(req, res, next);

        const err = expectNextHttpError(next, HttpStatusCode.UNAUTHORIZED);
        expect(err.message).toMatch(/not found/i);
    });
});

// ---------------------------------------------------------------------------
// requireAuth() — 401 when req.user is absent
// ---------------------------------------------------------------------------

describe('authMiddleware — requireAuth()', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return 401 JSON when req.user is undefined', () => {
        const { req, res, next } = createMocks(); // no user attached

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Unauthorized' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() without error when req.user is set', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u1', email: 'a@b.com', role: 'user', isActive: true };

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(); // no arguments
        expect(res.status).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// admin() — 401 unauthenticated, 403 wrong role, 200 correct role
// ---------------------------------------------------------------------------

describe('authMiddleware — admin() (requireRole admin)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return 401 when req.user is absent', () => {
        const { req, res, next } = createMocks();

        admin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when authenticated user has role "user" (not admin)', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u1', email: 'user@example.com', role: 'user', isActive: true };

        admin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Forbidden' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when authenticated user has role "professional" (not admin)', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u2', email: 'pro@example.com', role: 'professional', isActive: true };

        admin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when authenticated user has role "admin"', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u3', email: 'admin@example.com', role: 'admin', isActive: true };

        admin(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// professional() — 401 unauthenticated, 403 wrong role, 200 correct role
// ---------------------------------------------------------------------------

describe('authMiddleware — professional() (requireRole professional)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return 401 when req.user is absent', () => {
        const { req, res, next } = createMocks();

        professional(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when authenticated user has role "user" (not professional)', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u1', email: 'user@example.com', role: 'user', isActive: true };

        professional(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Forbidden' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when authenticated user has role "admin" (not professional)', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u2', email: 'admin@example.com', role: 'admin', isActive: true };

        professional(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when authenticated user has role "professional"', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u3', email: 'pro@example.com', role: 'professional', isActive: true };

        professional(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// checkOwnership() — deny-by-default, admin bypass, resource ownership
// ---------------------------------------------------------------------------

describe('authMiddleware — checkOwnership()', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return 401 when req.user is absent', () => {
        const { req, res, next } = createMocks();
        req.params = { id: '507f1f77bcf86cd799439011' };

        checkOwnership()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for admin regardless of resource id', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'admin-id', email: 'admin@example.com', role: 'admin', isActive: true };
        req.params = { id: 'some-other-user-id' };

        checkOwnership()(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next() when the resource id matches the authenticated user id', () => {
        const userId = '507f1f77bcf86cd799439011';
        const { req, res, next } = createMocks();
        req.user = { _id: userId, email: 'owner@example.com', role: 'user', isActive: true };
        req.params = { id: userId };

        checkOwnership()(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next() when _id is an object with toString() matching req.params.id (MongoDB ObjectId simulation)', () => {
        const idString = '507f1f77bcf86cd799439011';
        const mockObjectId = { toString: () => idString };

        const { req, res, next } = createMocks();
        req.user = { _id: mockObjectId as unknown as string, email: 'owner@example.com', role: 'user', isActive: true };
        req.params = { id: idString };

        checkOwnership()(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 403 when a non-admin user tries to access another user's resource", () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'user-a', email: 'a@example.com', role: 'user', isActive: true };
        req.params = { id: 'user-b' };

        checkOwnership()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Forbidden' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should deny by default when req.params.id is absent (no resource id to confirm ownership)', () => {
        const { req, res, next } = createMocks();
        req.user = { _id: 'u1', email: 'u@example.com', role: 'user', isActive: true };
        req.params = {}; // no id param

        checkOwnership()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
