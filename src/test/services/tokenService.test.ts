import { vi, describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import * as jwtNamespace from 'jsonwebtoken';
import { createHash } from 'crypto';
import { setupTestEnvironment, cleanupTestEnvironment } from '../testConfig.js';
import { TokenService } from '../../services/TokenService.js';
import { TokenRevokedError } from '../../types/Errors.js';
import type { Redis as RedisType } from 'ioredis';

vi.mock('../../clients/redisClient.js', () => ({
    executeIfCircuitClosed: vi.fn(async (operation: () => Promise<unknown>) => await operation()),
    getRedisClient: vi.fn(),
}));

type MockPipeline = {
    ttl: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
};

type MockRedis = {
    setex: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    scan: ReturnType<typeof vi.fn>;
    pipeline: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    flushall: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// JWT mock
// The real TokenService imports `import * as jwt from 'jsonwebtoken'` so it
// uses the *named* exports from the module (jwt.sign, jwt.verify, jwt.decode).
// vi.hoisted() ensures the spy references are available before vi.mock() is
// hoisted to the top of the module by Vitest's transform step.
// Error classes are forwarded from the real module so that
// `instanceof jwt.JsonWebTokenError` works inside the service.
// ---------------------------------------------------------------------------
const { _sign, _verify, _decode } = vi.hoisted(() => ({
    _sign: vi.fn(),
    _verify: vi.fn(),
    _decode: vi.fn(),
}));

vi.mock('jsonwebtoken', async importOriginal => {
    const real = await importOriginal<typeof jwtNamespace>();
    return {
        __esModule: true,
        // Named exports (used by `import * as jwt` in TokenService)
        sign: _sign,
        verify: _verify,
        decode: _decode,
        // Error classes forwarded so instanceof checks work inside the service
        JsonWebTokenError: real.JsonWebTokenError,
        TokenExpiredError: real.TokenExpiredError,
        NotBeforeError: real.NotBeforeError,
        // Default export mirrors the same fns (used by `import jwt from …`)
        default: {
            sign: _sign,
            verify: _verify,
            decode: _decode,
            JsonWebTokenError: real.JsonWebTokenError,
            TokenExpiredError: real.TokenExpiredError,
            NotBeforeError: real.NotBeforeError,
        },
    };
});

// Convenience alias — mockJwt.sign === _sign, etc.
const mockJwt = { sign: _sign, verify: _verify, decode: _decode };

// Production issuer/audience values used by TokenService
const ISSUER = 'vegan-guide-api';
const AUDIENCE = 'vegan-guide-client';

// ---------------------------------------------------------------------------
// Injected mock Redis — passed directly to the TokenService constructor so
// each test controls Redis behaviour without touching the real ioredis client.
// ---------------------------------------------------------------------------
// Default pipeline mock — tests that need specific pipeline behaviour override this
const makeMockPipeline = (): MockPipeline => {
    const pipe: MockPipeline = {
        ttl: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
    };
    return pipe;
};

const mockRedis: MockRedis = {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
    ttl: vi.fn(),
    pipeline: vi.fn(() => makeMockPipeline()),
    disconnect: vi.fn(),
    flushall: vi.fn(),
};

describe('TokenService', () => {
    let service: InstanceType<typeof TokenService>;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = process.env;
        setupTestEnvironment();
    });

    afterAll(() => {
        process.env = originalEnv;
        cleanupTestEnvironment();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Fresh instance per test — redis is injected so no real ioredis connection
        service = new TokenService(mockRedis as unknown as RedisType);
        mockRedis.setex.mockResolvedValue('OK');
        mockRedis.get.mockResolvedValue(null);
        mockRedis.del.mockResolvedValue(1);
        mockRedis.scan.mockResolvedValue(['0', []]);
        mockRedis.ttl.mockResolvedValue(-1);
    });

    // Configures jwt spies and returns the payload so tests can reuse it
    const setupMockToken = (
        mockPayload: Record<string, unknown> = {
            userId: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
        }
    ) => {
        mockJwt.sign.mockReturnValue('mock-token');
        mockJwt.verify.mockReturnValue(mockPayload);
        mockJwt.decode.mockReturnValue(mockPayload);
        return mockPayload;
    };

    // -----------------------------------------------------------------------
    describe('Constructor', () => {
        it('should initialize with environment variables', () => {
            expect(service).toBeDefined();
        });

        it('should require JWT_SECRET environment variable', () => {
            expect(process.env.JWT_SECRET).toBeDefined();
        });

        it('should require JWT_REFRESH_SECRET environment variable', () => {
            expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
        });

        it('should use default values for expiry times', () => {
            delete process.env.JWT_EXPIRES_IN;
            delete process.env.JWT_REFRESH_EXPIRES_IN;

            const testService = new TokenService(mockRedis as unknown as RedisType);
            expect(testService).toBeDefined();

            // Restore for subsequent tests
            process.env.JWT_EXPIRES_IN = '15m';
            process.env.JWT_REFRESH_EXPIRES_IN = '7d';
        });
    });

    // -----------------------------------------------------------------------
    describe('generateTokenPair', () => {
        it('should generate access and refresh tokens with per-device key (H-17)', async () => {
            const payload = { userId: faker.database.mongodbObjectId(), email: faker.internet.email() };
            setupMockToken(payload);

            const result = await service.generateTokenPair(payload);

            expect(mockJwt.sign).toHaveBeenCalledTimes(2);
            // H-17: key must include userId AND a jti segment
            const setexCall = mockRedis.setex.mock.calls[0] as [string, number, string];
            expect(setexCall[0]).toMatch(new RegExp(`^refresh_token:${payload.userId}:.+$`));
            expect(setexCall[1]).toBe(604800); // 7 days in seconds
            expect(setexCall[2]).toBe('mock-token');
            expect(result).toEqual({ accessToken: 'mock-token', refreshToken: 'mock-token' });
        });

        it('should include role in payload when provided', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'admin',
            };
            setupMockToken(payload);

            await service.generateTokenPair(payload);

            expect(mockJwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({ userId: payload.userId, email: payload.email, role: payload.role }),
                expect.any(String),
                expect.objectContaining({ issuer: ISSUER, audience: AUDIENCE })
            );
        });
    });

    // -----------------------------------------------------------------------
    describe('verifyAccessToken', () => {
        it('should verify valid access token', async () => {
            const mockPayload = { userId: faker.database.mongodbObjectId(), email: faker.internet.email() };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValue(null); // Not blacklisted

            const result = await service.verifyAccessToken('valid-token');

            expect(mockJwt.verify).toHaveBeenCalledWith(
                'valid-token',
                expect.any(String),
                expect.objectContaining({ issuer: ISSUER, audience: AUDIENCE })
            );
            expect(result).toEqual(mockPayload);
        });

        it('should reject blacklisted token', async () => {
            setupMockToken({ userId: faker.database.mongodbObjectId(), email: faker.internet.email() });
            mockRedis.get.mockResolvedValue('revoked');

            await expect(service.verifyAccessToken('blacklisted-token')).rejects.toThrow(TokenRevokedError);
        });

        it('should handle verification errors', async () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Token expired');
            });

            await expect(service.verifyAccessToken('expired-token')).rejects.toThrow(
                'Invalid or expired access token: Token expired'
            );
        });

        it('should reject token when Redis is unavailable (fail-closed)', async () => {
            // JWT is valid but Redis throws — the token must be rejected, not silently accepted
            const mockPayload = { userId: faker.database.mongodbObjectId(), email: faker.internet.email() };
            setupMockToken(mockPayload);
            mockRedis.get.mockRejectedValue(new Error('Redis connection refused'));

            await expect(service.verifyAccessToken('valid-jwt-redis-down')).rejects.toThrow(
                'Invalid or expired access token'
            );
        });

        it('should propagate TokenRevokedError as rejected (not swallowed as Redis error)', async () => {
            setupMockToken({ userId: faker.database.mongodbObjectId(), email: faker.internet.email() });
            mockRedis.get.mockResolvedValue('revoked');

            await expect(service.verifyAccessToken('revoked-token')).rejects.toThrow(TokenRevokedError);
        });
    });

    // -----------------------------------------------------------------------
    describe('verifyRefreshToken', () => {
        it('should verify valid refresh token (H-17: jti-keyed lookup)', async () => {
            const jti = faker.string.uuid();
            const mockPayload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                type: 'refresh',
                jti,
            };
            setupMockToken(mockPayload);
            // verifyToken calls isTokenBlacklisted first (get → null = not blacklisted),
            // then verifyRefreshToken checks refresh_token:{userId}:{jti}
            mockRedis.get
                .mockResolvedValueOnce(null) // blacklist check → not blacklisted
                .mockResolvedValueOnce('stored-token'); // refresh_token:{userId}:{jti} lookup

            const result = await service.verifyRefreshToken('stored-token');

            expect(result).toMatchObject({ userId: mockPayload.userId, email: mockPayload.email, type: 'refresh' });
            // The second Redis get should target the jti-scoped key
            expect(mockRedis.get).toHaveBeenCalledWith(`refresh_token:${mockPayload.userId}:${jti}`);
        });

        it('should reject token with wrong type', async () => {
            const mockPayload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                type: 'access', // Wrong type
                jti: faker.string.uuid(),
            };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValueOnce(null); // blacklist check

            await expect(service.verifyRefreshToken('wrong-type-token')).rejects.toThrow(
                'Invalid or expired refresh token: Invalid token type'
            );
        });

        it('should reject token when jti is missing from payload', async () => {
            const mockPayload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                type: 'refresh',
                // no jti — triggers H-17 guard
            };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValueOnce(null); // blacklist check

            await expect(service.verifyRefreshToken('no-jti-token')).rejects.toThrow(
                'Invalid or expired refresh token: Refresh token missing jti'
            );
        });

        it('should reject token not found in Redis', async () => {
            const mockPayload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                type: 'refresh',
                jti: faker.string.uuid(),
            };
            setupMockToken(mockPayload);
            // First call: blacklist check → null; second call: stored token → null
            mockRedis.get
                .mockResolvedValueOnce(null) // blacklist check
                .mockResolvedValueOnce(null); // refresh_token:{userId}:{jti} → not found

            await expect(service.verifyRefreshToken('missing-token')).rejects.toThrow(
                'Invalid or expired refresh token: Refresh token not found or invalid'
            );
        });

        it('should reject mismatched token', async () => {
            const mockPayload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                type: 'refresh',
                jti: faker.string.uuid(),
            };
            setupMockToken(mockPayload);
            mockRedis.get
                .mockResolvedValueOnce(null) // blacklist check → not blacklisted
                .mockResolvedValueOnce('different-token'); // stored token doesn't match

            await expect(service.verifyRefreshToken('request-token')).rejects.toThrow(
                'Invalid or expired refresh token: Refresh token not found or invalid'
            );
        });
    });

    // -----------------------------------------------------------------------
    describe('refreshTokens', () => {
        it('should refresh tokens and revoke the per-device key (H-17)', async () => {
            const jti = faker.string.uuid();
            const userId = faker.database.mongodbObjectId();
            const mockPayload = {
                userId,
                email: faker.internet.email(),
                type: 'refresh',
                jti,
            };
            setupMockToken(mockPayload);
            // verifyToken: blacklist check → null; verifyRefreshToken: stored token check → match
            mockRedis.get
                .mockResolvedValueOnce(null) // blacklist check
                .mockResolvedValueOnce('valid-refresh-token'); // refresh_token:{userId}:{jti} match

            const result = await service.refreshTokens('valid-refresh-token');

            // H-17: del should target the exact per-device key, not the bare userId key
            expect(mockRedis.del).toHaveBeenCalledWith(`refresh_token:${userId}:${jti}`);
            expect(result).toEqual({ accessToken: 'mock-token', refreshToken: 'mock-token' });
        });
    });

    // -----------------------------------------------------------------------
    describe('revokeRefreshToken', () => {
        it('should scan and delete all per-device tokens for the user (H-17)', async () => {
            const userId = faker.database.mongodbObjectId();
            const jti1 = faker.string.uuid();
            const jti2 = faker.string.uuid();

            // First SCAN returns two per-device keys, second SCAN signals done
            mockRedis.scan.mockResolvedValueOnce([
                '0',
                [`refresh_token:${userId}:${jti1}`, `refresh_token:${userId}:${jti2}`],
            ]);

            await service.revokeRefreshToken(userId);

            expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', `refresh_token:${userId}:*`, 'COUNT', 100);
            expect(mockRedis.del).toHaveBeenCalledWith(`refresh_token:${userId}:${jti1}`);
            expect(mockRedis.del).toHaveBeenCalledWith(`refresh_token:${userId}:${jti2}`);
        });

        it('should handle user with no active sessions gracefully', async () => {
            const userId = faker.database.mongodbObjectId();
            mockRedis.scan.mockResolvedValueOnce(['0', []]);

            await service.revokeRefreshToken(userId);

            expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', `refresh_token:${userId}:*`, 'COUNT', 100);
            expect(mockRedis.del).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    describe('blacklistToken', () => {
        it('should blacklist token with valid expiration', async () => {
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
            mockJwt.decode.mockReturnValue(mockDecoded);

            const token = 'valid-token';
            const expectedKey = `blacklist:hash:${createHash('sha256').update(token).digest('hex')}`;
            await service.blacklistToken(token);

            expect(mockRedis.setex).toHaveBeenCalledWith(expectedKey, expect.any(Number), 'revoked');
        });

        it('should use minimum TTL of 3600 for already-expired token', async () => {
            // Real TokenService: Math.max(expirationTime, 3600) — negative times become 3600
            const mockDecoded = { exp: Math.floor(Date.now() / 1000) - 3600 };
            mockJwt.decode.mockReturnValue(mockDecoded);

            const token = 'expired-token';
            const expectedKey = `blacklist:hash:${createHash('sha256').update(token).digest('hex')}`;
            await service.blacklistToken(token);

            expect(mockRedis.setex).toHaveBeenCalledWith(expectedKey, 3600, 'revoked');
        });

        it('should handle malformed token (decode throws)', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Malformed token');
            });

            const token = 'malformed-token';
            const expectedKey = `blacklist:hash:${createHash('sha256').update(token).digest('hex')}`;
            await service.blacklistToken(token);

            expect(mockRedis.setex).toHaveBeenCalledWith(expectedKey, 3600, 'revoked');
        });

        it('should use default TTL when decoded token has no exp', async () => {
            // null → decoded?.exp is undefined → falls through to default TTL 3600
            mockJwt.decode.mockReturnValue(null);

            const token = 'null-token';
            const expectedKey = `blacklist:hash:${createHash('sha256').update(token).digest('hex')}`;
            await service.blacklistToken(token);

            expect(mockRedis.setex).toHaveBeenCalledWith(expectedKey, 3600, 'revoked');
        });
    });

    // -----------------------------------------------------------------------
    describe('isTokenBlacklisted', () => {
        it('should return true for blacklisted token', async () => {
            mockRedis.get.mockResolvedValue('revoked');

            const token = 'blacklisted-token';
            const expectedKey = `blacklist:hash:${createHash('sha256').update(token).digest('hex')}`;
            const result = await service.isTokenBlacklisted(token);

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);
        });

        it('should return false for non-blacklisted token', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await service.isTokenBlacklisted('valid-token');

            expect(result).toBe(false);
        });

        it('re-throws when redis.get rejects (fail-closed)', async () => {
            mockRedis.get.mockRejectedValueOnce(new Error('Redis connection lost'));

            await expect(service.isTokenBlacklisted('some-token')).rejects.toThrow('Redis connection lost');
        });
    });

    // -----------------------------------------------------------------------
    describe('cleanup (H-11: pipelined TTL checks + DELs)', () => {
        it('uses pipeline for TTL checks and DELs — deletes only keys with no TTL', async () => {
            mockRedis.scan.mockResolvedValueOnce(['0', ['blacklist:token1', 'blacklist:token2']]);

            // Build a pipeline mock with controlled exec results
            const ttlPipeline = {
                ttl: vi.fn().mockReturnThis(),
                del: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    [null, -1], // token1: no TTL → delete
                    [null, 3600], // token2: has TTL → keep
                ]),
            };
            const delPipeline = {
                ttl: vi.fn().mockReturnThis(),
                del: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, 1]]),
            };
            // First pipeline call = TTL check, second = DEL
            mockRedis.pipeline.mockReturnValueOnce(ttlPipeline).mockReturnValueOnce(delPipeline);

            const deleted = await service.cleanup();

            // Verify pipelined TTL checks (not individual redis.ttl calls)
            expect(mockRedis.pipeline).toHaveBeenCalledTimes(2);
            expect(ttlPipeline.ttl).toHaveBeenCalledWith('blacklist:token1');
            expect(ttlPipeline.ttl).toHaveBeenCalledWith('blacklist:token2');
            expect(ttlPipeline.exec).toHaveBeenCalledTimes(1);

            // Verify pipelined DEL for only the no-TTL key
            expect(delPipeline.del).toHaveBeenCalledWith('blacklist:token1');
            expect(delPipeline.del).not.toHaveBeenCalledWith('blacklist:token2');
            expect(delPipeline.exec).toHaveBeenCalledTimes(1);

            // Individual redis.ttl / redis.del must NOT have been called (pipeline replaces them)
            expect(mockRedis.ttl).not.toHaveBeenCalled();
            expect(mockRedis.del).not.toHaveBeenCalled();

            expect(deleted).toBe(1);
        });

        it('skips DEL pipeline when all keys have a TTL set', async () => {
            mockRedis.scan.mockResolvedValueOnce(['0', ['blacklist:a', 'blacklist:b']]);

            const ttlPipeline = {
                ttl: vi.fn().mockReturnThis(),
                del: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([
                    [null, 1800], // a: has TTL
                    [null, 3600], // b: has TTL
                ]),
            };
            mockRedis.pipeline.mockReturnValueOnce(ttlPipeline);

            const deleted = await service.cleanup();

            expect(mockRedis.pipeline).toHaveBeenCalledTimes(1); // only TTL pipeline, no DEL pipeline
            expect(deleted).toBe(0);
        });

        it('should handle empty blacklist', async () => {
            mockRedis.scan.mockResolvedValueOnce(['0', []]);

            const deleted = await service.cleanup();

            expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'blacklist:*', 'COUNT', 100);
            expect(mockRedis.pipeline).not.toHaveBeenCalled();
            expect(deleted).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    describe('revokeAllUserTokens', () => {
        it('should revoke all user tokens', async () => {
            const mockRevokeRefreshToken = vi.spyOn(service, 'revokeRefreshToken');
            mockRevokeRefreshToken.mockResolvedValue();
            mockRedis.setex.mockResolvedValue('OK');

            const userId = faker.database.mongodbObjectId();
            await service.revokeAllUserTokens(userId);

            expect(mockRevokeRefreshToken).toHaveBeenCalledWith(userId);
            expect(mockRedis.setex).toHaveBeenCalledWith(`user_tokens:${userId}`, 24 * 60 * 60, 'revoked');
        });
    });

    // -----------------------------------------------------------------------
    describe('isUserTokensRevoked', () => {
        it('should return true when user tokens are revoked', async () => {
            mockRedis.get.mockResolvedValue('revoked');

            const userId = faker.database.mongodbObjectId();
            const result = await service.isUserTokensRevoked(userId);

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith(`user_tokens:${userId}`);
        });

        it('should return false when user tokens are not revoked', async () => {
            mockRedis.get.mockResolvedValue(null);

            const userId = faker.database.mongodbObjectId();
            const result = await service.isUserTokensRevoked(userId);

            expect(result).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    describe('getTokenInfo', () => {
        it('should return token info for valid token', async () => {
            const mockToken = 'valid-token';
            const mockDecoded = {
                header: { alg: 'HS256', typ: 'JWT' },
                payload: { userId: faker.database.mongodbObjectId(), email: faker.internet.email() },
            };
            mockJwt.decode.mockReturnValue(mockDecoded);

            const result = await service.getTokenInfo(mockToken);

            expect(result).toEqual({
                header: mockDecoded.header,
                payload: mockDecoded.payload,
                isValid: true,
            });
            expect(mockJwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
        });

        it('should return error for invalid token format', async () => {
            mockJwt.decode.mockReturnValue(null);

            const result = await service.getTokenInfo('invalid-token');

            expect(result).toEqual({ isValid: false, error: 'Invalid token format' });
        });

        it('should handle decode errors', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Malformed token');
            });

            const result = await service.getTokenInfo('malformed-token');

            expect(result).toEqual({ isValid: false, error: 'Malformed token' });
        });

        it('should handle non-Error exceptions', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw 'String error';
            });

            const result = await service.getTokenInfo('problematic-token');

            expect(result).toEqual({ isValid: false, error: 'Invalid token format' });
        });

        it('should handle token with invalid payload structure', async () => {
            // The service distinguishes "bad outer structure" (Invalid token format)
            // from "payload is not an object" (Invalid payload format).
            const mockDecoded = {
                header: { alg: 'HS256', typ: 'JWT' },
                payload: 'string-payload', // Present but not an object → payload format error
            };
            mockJwt.decode.mockReturnValue(mockDecoded);

            const result = await service.getTokenInfo('token-with-invalid-payload');

            expect(result).toEqual({ isValid: false, error: 'Invalid payload format' });
        });
    });

    // -----------------------------------------------------------------------
    describe('disconnect', () => {
        it('should disconnect from Redis', async () => {
            mockRedis.disconnect.mockImplementation(() => {});

            await service.disconnect();

            expect(mockRedis.disconnect).toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    describe('Redis Configuration', () => {
        it('should accept injected Redis client', () => {
            const injectedService = new TokenService(mockRedis as unknown as RedisType);
            expect(injectedService).toBeDefined();
        });
    });
});
