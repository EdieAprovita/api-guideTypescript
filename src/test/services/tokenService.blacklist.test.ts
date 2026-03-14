/**
 * BACK-03 / BACK-05 — Blacklist Redis key uses jti, Redis failures re-throw.
 *
 * Pattern mirrors tokenService.test.ts:
 *   - Local TestTokenService class with injected mockRedis
 *   - vi.mock('jsonwebtoken') for full ESM mock control
 *   - Vitest + no external dependencies
 */
import { vi, describe, it, beforeEach, expect } from 'vitest';
import jwt from 'jsonwebtoken';

// ------------------------------------------------------------------
// jwt ESM mock (same shape as tokenService.test.ts)
// ------------------------------------------------------------------
vi.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
        decode: vi.fn(),
    },
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn(),
}));

const mockJwt = jwt as unknown as {
    decode: ReturnType<typeof vi.fn>;
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
};

// ------------------------------------------------------------------
// Redis mock
// ------------------------------------------------------------------
const mockRedis = {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    ttl: vi.fn(),
    disconnect: vi.fn(),
};

// ------------------------------------------------------------------
// Minimal TestTokenService — mirrors production blacklistToken /
// isTokenBlacklisted logic (BACK-03 version: jti-keyed blacklist)
// ------------------------------------------------------------------
class TestTokenService {
    private readonly redis = mockRedis;

    async blacklistToken(token: string): Promise<void> {
        let blacklistKey = `blacklist:${token}`; // fallback
        let ttl = 3600;

        try {
            const decoded = mockJwt.decode(token) as { exp?: number; jti?: string } | null;
            if (decoded?.jti) {
                blacklistKey = `blacklist:${decoded.jti}`;
            }
            if (decoded?.exp) {
                const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
                ttl = Math.max(expirationTime, 3600);
            }
        } catch {
            // jwt.decode failed — use default key and TTL
        }

        await this.redis.setex(blacklistKey, ttl, 'revoked');
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        let blacklistKey = `blacklist:${token}`; // fallback

        try {
            const decoded = mockJwt.decode(token) as { jti?: string } | null;
            if (decoded?.jti) {
                blacklistKey = `blacklist:${decoded.jti}`;
            }
        } catch {
            // jwt.decode failed — use default key
        }

        const result = await this.redis.get(blacklistKey);
        return result !== null;
    }
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------
describe('TokenService — blacklist (BACK-03 / BACK-05)', () => {
    let service: TestTokenService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new TestTokenService();
        mockRedis.setex.mockResolvedValue('OK');
        mockRedis.get.mockResolvedValue(null);
    });

    // ----------------------------------------------------------------
    // BACK-05: Redis failure must re-throw (fail-closed)
    // ----------------------------------------------------------------
    describe('BACK-05: blacklistToken — Redis failure', () => {
        it('re-throws when redis.setex rejects (fail-closed)', async () => {
            const redisError = new Error('ECONNREFUSED');
            mockRedis.setex.mockRejectedValue(redisError);
            mockJwt.decode.mockReturnValue({ jti: 'some-uuid', exp: Math.floor(Date.now() / 1000) + 3600 });

            await expect(service.blacklistToken('any-token')).rejects.toThrow('ECONNREFUSED');
        });

        it('re-throws even when jwt.decode returns null (fallback key path)', async () => {
            const redisError = new Error('Redis timeout');
            mockRedis.setex.mockRejectedValue(redisError);
            mockJwt.decode.mockReturnValue(null);

            await expect(service.blacklistToken('no-jti-token')).rejects.toThrow('Redis timeout');
        });
    });

    // ----------------------------------------------------------------
    // BACK-03: key is blacklist:${jti} when jti is present
    // ----------------------------------------------------------------
    describe('BACK-03: blacklistToken — jti key', () => {
        it('uses blacklist:${jti} as Redis key when token has jti', async () => {
            const jti = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
            mockJwt.decode.mockReturnValue({
                jti,
                exp: Math.floor(Date.now() / 1000) + 3600,
            });

            await service.blacklistToken('header.payload.sig');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                `blacklist:${jti}`,
                expect.any(Number),
                'revoked',
            );
        });

        it('computes ttl from exp when jti is present', async () => {
            const jti = 'test-jti-uuid';
            const futureExp = Math.floor(Date.now() / 1000) + 7200; // 2 h from now
            mockJwt.decode.mockReturnValue({ jti, exp: futureExp });

            await service.blacklistToken('token');

            const [, ttlArg] = mockRedis.setex.mock.calls[0] as [string, number, string];
            expect(ttlArg).toBeGreaterThanOrEqual(7200 - 1); // allow 1 s clock drift
            expect(ttlArg).toBeLessThanOrEqual(7200);
        });

        it('enforces minimum ttl of 3600 even when token is nearly expired', async () => {
            const jti = 'almost-expired-jti';
            // exp 10 seconds in the future — ttl should be clamped to 3600
            mockJwt.decode.mockReturnValue({
                jti,
                exp: Math.floor(Date.now() / 1000) + 10,
            });

            await service.blacklistToken('nearly-expired-token');

            const [, ttlArg] = mockRedis.setex.mock.calls[0] as [string, number, string];
            expect(ttlArg).toBe(3600);
        });
    });

    // ----------------------------------------------------------------
    // BACK-03: key falls back to blacklist:${token} when jti missing
    // ----------------------------------------------------------------
    describe('BACK-03: blacklistToken — fallback key (no jti)', () => {
        it('falls back to blacklist:${token} when decoded has no jti', async () => {
            mockJwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

            await service.blacklistToken('raw-token-string');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'blacklist:raw-token-string',
                expect.any(Number),
                'revoked',
            );
        });

        it('falls back to blacklist:${token} when jwt.decode returns null', async () => {
            mockJwt.decode.mockReturnValue(null);

            await service.blacklistToken('null-decode-token');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'blacklist:null-decode-token',
                3600,
                'revoked',
            );
        });

        it('falls back to blacklist:${token} when jwt.decode throws', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Malformed JWT');
            });

            await service.blacklistToken('malformed-token');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'blacklist:malformed-token',
                3600,
                'revoked',
            );
        });
    });

    // ----------------------------------------------------------------
    // isTokenBlacklisted — symmetric key resolution
    // ----------------------------------------------------------------
    describe('isTokenBlacklisted — key resolution mirrors blacklistToken', () => {
        it('queries blacklist:${jti} when token has jti', async () => {
            const jti = 'check-jti-uuid';
            mockJwt.decode.mockReturnValue({ jti });
            mockRedis.get.mockResolvedValue('revoked');

            const result = await service.isTokenBlacklisted('some-token');

            expect(mockRedis.get).toHaveBeenCalledWith(`blacklist:${jti}`);
            expect(result).toBe(true);
        });

        it('queries blacklist:${token} when token has no jti (fallback)', async () => {
            mockJwt.decode.mockReturnValue({ sub: 'user-id' }); // no jti field
            mockRedis.get.mockResolvedValue(null);

            const result = await service.isTokenBlacklisted('no-jti-token');

            expect(mockRedis.get).toHaveBeenCalledWith('blacklist:no-jti-token');
            expect(result).toBe(false);
        });

        it('queries blacklist:${token} when jwt.decode throws', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw new Error('bad token');
            });
            mockRedis.get.mockResolvedValue(null);

            const result = await service.isTokenBlacklisted('broken-token');

            expect(mockRedis.get).toHaveBeenCalledWith('blacklist:broken-token');
            expect(result).toBe(false);
        });
    });
});
