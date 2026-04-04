import * as jwt from 'jsonwebtoken';
import type { Redis as RedisType } from 'ioredis';
import { createHash } from 'crypto';
import logger from '../utils/logger.js';
import { executeIfCircuitClosed, getRedisClient } from '../clients/redisClient.js';
import type {
    TokenPayload,
    TokenPair,
    RefreshTokenPayload,
    TokenInfo,
    PipelineClient,
} from './tokenService/tokenTypes.js';
import { JWT_CONFIG, REDIS_KEY_PATTERNS, TOKEN_TTL } from './tokenService/tokenTypes.js';
import { createMockRedis } from './tokenService/mockRedis.js';
import { createTokenPayload, signToken, debugLog, debugError } from './tokenService/tokenGeneration.js';
import {
    buildVerifyToken,
    verifyAccessTokenImpl,
    verifyRefreshTokenImpl,
    refreshTokensImpl,
} from './tokenService/tokenVerification.js';

class TokenService {
    private redis!: RedisType;
    private accessTokenSecret?: string;
    private refreshTokenSecret?: string;
    private accessTokenExpiry!: string;
    private refreshTokenExpiry!: string;
    private readonly useCircuitBreaker: boolean;
    private initialized = false;

    private async executeRedis<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
        if (!this.useCircuitBreaker) {
            return await operation();
        }
        const result = await executeIfCircuitClosed(operation);
        if (result === null) {
            throw new Error(`Redis operation skipped because circuit breaker is open: ${operationName}`);
        }
        return result;
    }

    /**
     * @param redisClient Optional Redis client to inject (used in tests to avoid
     *   real connections). When omitted the shared singleton from redisClient.ts
     *   is used, ensuring CacheService and TokenService share the same connection.
     */
    constructor(redisClient?: RedisType) {
        if (redisClient) {
            this.redis = redisClient;
            this.useCircuitBreaker = false;
        } else if (process.env.NODE_ENV === 'test') {
            this.redis = createMockRedis();
            this.useCircuitBreaker = false;
        } else {
            this.redis = getRedisClient();
            this.useCircuitBreaker = true;
        }
        // Don't initialize secrets in constructor - do it lazily on first use
    }

    /**
     * Lazy initialization of secrets - only throws when actually needed
     */
    private ensureInitialized(): void {
        if (!this.initialized) {
            try {
                this.initializeSecrets();
                this.initialized = true;
            } catch (error) {
                // In production, we want to fail fast if secrets are missing
                // But allow the server to start for health checks
                if (process.env.NODE_ENV !== 'test') {
                    logger.warn('JWT secrets not configured - token operations will fail');
                }
                throw error;
            }
        }
    }

    private initializeSecrets(): void {
        this.accessTokenSecret = this.getRequiredEnvVar('JWT_SECRET');
        this.refreshTokenSecret = this.getRequiredEnvVar('JWT_REFRESH_SECRET');
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN ?? '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
    }

    private getRequiredEnvVar(name: string): string {
        const value = process.env[name];
        if (!value) {
            throw new Error(`${name} environment variable is required`);
        }
        return value;
    }

    /**
     * Core token verifier: validates JWT signature/claims then checks blacklist.
     * Built via buildVerifyToken so the logic lives in tokenVerification.ts while
     * the blacklist dependency (isTokenBlacklisted) is wired here in the class.
     */
    private verifyToken(token: string, secret: string): Promise<TokenPayload> {
        return buildVerifyToken(t => this.isTokenBlacklisted(t))(token, secret);
    }

    async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
        this.ensureInitialized();
        debugLog('generateTokenPair called with payload:', payload);

        const tokenPayload = createTokenPayload(payload);
        debugLog('Created token payload:', tokenPayload);

        debugLog('About to sign access token...');
        const accessToken = signToken(tokenPayload, this.accessTokenSecret!, this.accessTokenExpiry, JWT_CONFIG);
        debugLog('Access token result:', accessToken ? 'GENERATED' : 'UNDEFINED');

        const refreshPayload = { ...tokenPayload, type: 'refresh' as const };
        debugLog('About to sign refresh token...');
        const refreshToken = signToken(refreshPayload, this.refreshTokenSecret!, this.refreshTokenExpiry, JWT_CONFIG);
        debugLog('Refresh token result:', refreshToken ? 'GENERATED' : 'UNDEFINED');

        // Store refresh token in Redis using per-device key (H-17).
        // Key pattern: refresh_token:{userId}:{jti} — the jti from tokenPayload
        // uniquely identifies this session, enabling per-device revocation without
        // invalidating other active sessions for the same user.
        const refreshTokenKey = REDIS_KEY_PATTERNS.refreshToken(payload.userId, tokenPayload.jti);
        debugLog('About to store in Redis with key:', refreshTokenKey);

        try {
            await this.executeRedis('store refresh token', () =>
                this.redis.setex(refreshTokenKey, TOKEN_TTL.refreshTokenSeconds, refreshToken)
            );
            debugLog('Successfully stored in Redis');
        } catch (redisError) {
            debugError('Redis error storing refresh token:', redisError);
            // Fail-closed: if we can't persist the refresh token, the user won't be
            // able to refresh later. Better to fail now than issue an unusable pair.
            throw new Error('Unable to complete token generation — please try again later');
        }

        const result = { accessToken, refreshToken };
        debugLog('Final result:', result);
        return result;
    }

    // Compatibility method for existing integration tests
    async generateTokens(userId: string, email?: string, role?: string): Promise<TokenPair> {
        const payload: TokenPayload = {
            userId,
            email: email || '',
            ...(role && { role }),
        };
        return this.generateTokenPair(payload);
    }

    async verifyAccessToken(token: string): Promise<TokenPayload> {
        this.ensureInitialized();
        return verifyAccessTokenImpl(token, (t, s) => this.verifyToken(t, s), this.accessTokenSecret!);
    }

    async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
        this.ensureInitialized();
        return verifyRefreshTokenImpl(
            token,
            (t, s) => this.verifyToken(t, s),
            this.refreshTokenSecret!,
            (name, op) => this.executeRedis(name, op),
            this.redis
        );
    }

    async refreshTokens(refreshToken: string): Promise<TokenPair> {
        return refreshTokensImpl(
            refreshToken,
            t => this.verifyRefreshToken(t),
            p => this.generateTokenPair(p),
            t => this.blacklistToken(t),
            key => this.revokeRefreshTokenByKey(key),
            userId => this.revokeRefreshToken(userId)
        );
    }

    async blacklistToken(token: string): Promise<void> {
        let blacklistKey: string;
        let ttl: number = TOKEN_TTL.blacklistDefaultSeconds;

        try {
            const decoded = jwt.decode(token) as { exp?: number; jti?: string } | null;
            if (decoded?.jti) {
                blacklistKey = REDIS_KEY_PATTERNS.blacklistJti(decoded.jti);
            } else {
                const tokenHash = createHash('sha256').update(token).digest('hex');
                blacklistKey = REDIS_KEY_PATTERNS.blacklistHash(tokenHash);
                logger.warn('blacklistToken: token missing jti — using SHA-256 hash as fallback key');
            }
            if (decoded?.exp) {
                const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
                ttl = Math.max(expirationTime, TOKEN_TTL.blacklistDefaultSeconds);
            }
        } catch {
            // jwt.decode failed (malformed token) — fall back to SHA-256 hash
            const tokenHash = createHash('sha256').update(token).digest('hex');
            blacklistKey = REDIS_KEY_PATTERNS.blacklistHash(tokenHash);
        }

        // Fail-closed: if Redis is unavailable this will throw. The logout controller
        // handles this with a best-effort catch so the client session still ends.
        await this.executeRedis('blacklist token', () => this.redis.setex(blacklistKey, ttl, 'revoked'));
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        try {
            const decoded = jwt.decode(token) as { jti?: string } | null;
            if (decoded?.jti) {
                const result = await this.executeRedis('get blacklist jti', () =>
                    this.redis.get(REDIS_KEY_PATTERNS.blacklistJti(decoded.jti!))
                );
                return result !== null;
            }
        } catch {
            // jwt.decode failed — fall through to hash check
        }
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const result = await this.executeRedis('get blacklist hash', () =>
            this.redis.get(REDIS_KEY_PATTERNS.blacklistHash(tokenHash))
        );
        return result !== null;
    }

    /**
     * Revokes all per-device refresh tokens for a user by scanning
     * the refresh_token:{userId}:* key space and deleting every match.
     * Used by revokeAllUserTokens and as a fallback in refreshTokens
     * when jti is unavailable (H-17).
     */
    async revokeRefreshToken(userId: string): Promise<void> {
        let cursor = '0';
        do {
            const [nextCursor, keys] = await this.executeRedis('scan refresh tokens for user', () =>
                this.redis.scan(cursor, 'MATCH', REDIS_KEY_PATTERNS.refreshTokenScan(userId), 'COUNT', 100)
            );
            cursor = nextCursor;
            if (keys.length > 0) {
                // Pipeline all DELs per SCAN batch to avoid N+1 round-trips
                const delPipeline = (this.redis as RedisType & { pipeline: () => PipelineClient }).pipeline();
                for (const key of keys) {
                    delPipeline.del(key);
                }
                await this.executeRedis('pipeline DEL revoked tokens', () => delPipeline.exec());
            }
        } while (cursor !== '0');
    }

    /**
     * Revokes a single per-device refresh token by its exact Redis key.
     * Used during token rotation (refreshTokens) to remove only the
     * session being rotated, leaving other active sessions intact (H-17).
     */
    private async revokeRefreshTokenByKey(key: string): Promise<void> {
        await this.executeRedis('revoke single refresh token', () => this.redis.del(key));
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        await this.revokeRefreshToken(userId);

        // Mark all access tokens for this user as revoked
        const userTokenKey = REDIS_KEY_PATTERNS.userTokens(userId);
        await this.executeRedis('revoke all user tokens', () =>
            this.redis.setex(userTokenKey, TOKEN_TTL.userTokensSeconds, 'revoked')
        );
    }

    async isUserTokensRevoked(userId: string): Promise<boolean> {
        const userTokenKey = REDIS_KEY_PATTERNS.userTokens(userId);
        const result = await this.executeRedis('get user token revocation', () => this.redis.get(userTokenKey));
        return result === 'revoked';
    }

    async getTokenInfo(token: string): Promise<TokenInfo> {
        try {
            const decoded = jwt.decode(token, { complete: true });

            if (!decoded || typeof decoded !== 'object' || !('header' in decoded) || !('payload' in decoded)) {
                return { isValid: false, error: 'Invalid token format' };
            }

            const { header, payload } = decoded;

            if (typeof payload !== 'object' || payload === null) {
                return { isValid: false, error: 'Invalid payload format' };
            }

            return {
                header,
                payload: payload as jwt.JwtPayload,
                isValid: true,
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Invalid token format',
            };
        }
    }

    /**
     * Removes blacklist entries that have no TTL set (should not normally happen,
     * but provides a safety net for manual admin operations that bypass setex).
     *
     * H-11: Eliminates the N+1 Redis call pattern by pipelining all TTL checks
     * per SCAN batch, then pipelining the DEL operations for keys without a TTL.
     * Returns the number of keys deleted.
     */
    async cleanup(): Promise<number> {
        let cursor = '0';
        let deletedCount = 0;

        do {
            const [nextCursor, keys] = await this.executeRedis('scan blacklist keys', () =>
                this.redis.scan(cursor, 'MATCH', REDIS_KEY_PATTERNS.blacklistAll, 'COUNT', 100)
            );
            cursor = nextCursor;

            if (keys.length > 0) {
                // Pipeline all TTL checks for this batch in a single round-trip
                const ttlPipeline = (this.redis as RedisType & { pipeline: () => PipelineClient }).pipeline();
                for (const key of keys) {
                    ttlPipeline.ttl(key);
                }
                const ttlResults = await this.executeRedis('pipeline TTL batch', () => ttlPipeline.exec());

                // Collect keys with no TTL set (TTL === -1 means key exists but no expiry)
                const noTtlKeys = keys.filter((_key, i) => {
                    const ttl = ttlResults?.[i]?.[1] as number | undefined;
                    return ttl === -1;
                });

                // Pipeline DEL operations for all expired/no-TTL keys
                if (noTtlKeys.length > 0) {
                    const delPipeline = (this.redis as RedisType & { pipeline: () => PipelineClient }).pipeline();
                    for (const key of noTtlKeys) {
                        delPipeline.del(key);
                    }
                    await this.executeRedis('pipeline DEL batch', () => delPipeline.exec());
                    deletedCount += noTtlKeys.length;
                }
            }
        } while (cursor !== '0');

        return deletedCount;
    }

    async disconnect(): Promise<void> {
        this.redis.disconnect();
    }

    async clearAllForTesting(): Promise<void> {
        if (process.env.NODE_ENV === 'test') {
            const redis = this.redis as RedisType & { flushall?: () => Promise<string> };
            if (redis.flushall) {
                await redis.flushall();
            }
        }
    }
}

export { TokenService };
export default new TokenService();
