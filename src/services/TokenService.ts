import * as jwt from 'jsonwebtoken';
import RedisLib from 'ioredis';
import type { Redis as RedisType } from 'ioredis';
const Redis = RedisLib.default || RedisLib;
import { randomUUID, createHash } from 'crypto';
import { TokenRevokedError, HttpError, HttpStatusCode } from '../types/Errors.js';
import logger from '../utils/logger.js';

interface TokenPayload {
    userId: string;
    email: string;
    role?: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface RefreshTokenPayload extends TokenPayload {
    type: 'refresh';
}

interface TokenInfo {
    header?: jwt.JwtHeader;
    payload?: jwt.JwtPayload;
    isValid: boolean;
    error?: string;
}

// Mock Redis for testing
interface MockRedisEntry {
    value: string;
    expiry: number;
}

let mockRedisStorage: Map<string, MockRedisEntry>;

class TokenService {
    private redis!: RedisType;
    private accessTokenSecret?: string;
    private refreshTokenSecret?: string;
    private accessTokenExpiry!: string;
    private refreshTokenExpiry!: string;
    private readonly issuer = 'vegan-guide-api';
    private readonly audience = 'vegan-guide-client';
    private initialized = false;

    /**
     * @param redisClient Optional Redis client to inject (used in tests to avoid
     *   real connections). When omitted the service selects mock or real Redis
     *   based on NODE_ENV, preserving production behaviour.
     */
    constructor(redisClient?: RedisType) {
        if (redisClient) {
            this.redis = redisClient;
        } else {
            // Initialize Redis immediately (it's lazy-loaded anyway)
            this.initializeRedis();
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
                    console.warn('⚠️ JWT secrets not configured - token operations will fail');
                }
                throw error;
            }
        }
    }

    private initializeRedis(): void {
        if (process.env.NODE_ENV === 'test') {
            this.initializeMockRedis();
        } else {
            this.initializeRealRedis();
        }
    }

    private initializeMockRedis(): void {
        if (!mockRedisStorage) {
            mockRedisStorage = new Map<string, MockRedisEntry>();
        }

        this.redis = {
            setex: (key: string, seconds: number, value: string) => {
                const expiry = Date.now() + seconds * 1000;
                mockRedisStorage.set(key, { value, expiry });
                return Promise.resolve('OK');
            },
            get: (key: string) => {
                const entry = mockRedisStorage.get(key);
                if (!entry || Date.now() > entry.expiry) {
                    mockRedisStorage.delete(key);
                    return Promise.resolve(null);
                }
                return Promise.resolve(entry.value);
            },
            del: (key: string) => {
                const existed = mockRedisStorage.has(key);
                mockRedisStorage.delete(key);
                return Promise.resolve(existed ? 1 : 0);
            },
            scan: (_cursor: string, _matchArg: string, pattern: string, _countArg: string, _count: number) => {
                const allKeys = Array.from(mockRedisStorage.keys());
                const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                const regex = new RegExp(`^${escaped}$`);
                const matched = allKeys.filter(key => regex.test(key));
                // Return all results in one shot (cursor '0' = done)
                return Promise.resolve(['0', matched] as [string, string[]]);
            },
            ttl: (key: string) => {
                const entry = mockRedisStorage.get(key);
                if (!entry) return Promise.resolve(-2);

                const remainingTime = Math.floor((entry.expiry - Date.now()) / 1000);
                return Promise.resolve(remainingTime > 0 ? remainingTime : -1);
            },
            disconnect: () => {
                mockRedisStorage.clear();
                return Promise.resolve();
            },
            flushall: () => {
                mockRedisStorage.clear();
                return Promise.resolve('OK');
            },
        } as unknown as RedisType;
    }

    private initializeRealRedis(): void {
        const redisConfig = {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
            lazyConnect: true,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 1,
            retryStrategy(times: number): number | null {
                if (times > 10) return null;
                return Math.min(times * 200, 3000);
            },
            ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
        };

        this.redis = new Redis(redisConfig);

        this.redis.on('error', (error: Error) => {
            logger.error('TokenService Redis error', { error: error.message });
        });

        this.redis.on('reconnecting', (delay: number) => {
            logger.warn('TokenService Redis reconnecting', { delay });
        });
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

    private createTokenPayload(payload: TokenPayload): TokenPayload & { iat: number; jti: string } {
        return {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            jti: randomUUID(),
        };
    }

    private signToken(payload: object, secret: string, expiresIn: string): string {
        if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
            console.log('🔧 signToken called with:', {
                payloadKeys: Object.keys(payload),
                secretLength: secret.length,
                expiresIn,
                issuer: this.issuer,
                audience: this.audience,
            });
        }

        try {
            const result = jwt.sign(payload, secret, {
                expiresIn,
                issuer: this.issuer,
                audience: this.audience,
                algorithm: 'HS256',
            } as jwt.SignOptions);

            if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
                console.log('🔧 signToken result:', result ? 'GENERATED' : 'UNDEFINED');
            }
            return result;
        } catch (error) {
            if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
                console.error('🔧 signToken error:', error);
            }
            throw error;
        }
    }

    private debugLog(message: string, ...optionalParams: any[]): void {
        if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
            console.log(`🔧 ${message}`, ...optionalParams);
        }
    }

    private debugError(message: string, ...optionalParams: any[]): void {
        if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
            console.error(`🔧 ${message}`, ...optionalParams);
        }
    }

    async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
        this.ensureInitialized();
        this.debugLog('generateTokenPair called with payload:', payload);

        const tokenPayload = this.createTokenPayload(payload);
        this.debugLog('Created token payload:', tokenPayload);

        this.debugLog('About to sign access token...');
        const accessToken = this.signToken(tokenPayload, this.accessTokenSecret!, this.accessTokenExpiry);
        this.debugLog('Access token result:', accessToken ? 'GENERATED' : 'UNDEFINED');

        const refreshPayload = { ...tokenPayload, type: 'refresh' as const };
        this.debugLog('About to sign refresh token...');
        const refreshToken = this.signToken(refreshPayload, this.refreshTokenSecret!, this.refreshTokenExpiry);
        this.debugLog('Refresh token result:', refreshToken ? 'GENERATED' : 'UNDEFINED');

        // Store refresh token in Redis
        const refreshTokenKey = `refresh_token:${payload.userId}`;
        this.debugLog('About to store in Redis with key:', refreshTokenKey);

        try {
            await this.redis.setex(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken);
            this.debugLog('Successfully stored in Redis');
        } catch (redisError) {
            this.debugError('Redis error storing refresh token:', redisError);
            // Fail-closed: if we can't persist the refresh token, the user won't be
            // able to refresh later. Better to fail now than issue an unusable pair.
            throw new Error('Unable to complete token generation — please try again later');
        }

        const result = { accessToken, refreshToken };
        this.debugLog('Final result:', result);
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

    private async verifyToken(token: string, secret: string): Promise<TokenPayload> {
        try {
            // First verify the JWT signature and structure
            const decoded = jwt.verify(token, secret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: ['HS256'],
            }) as TokenPayload;

            // Check if token is blacklisted — fail-closed: reject token if Redis is unavailable
            try {
                const isBlacklisted = await this.isTokenBlacklisted(token);
                if (isBlacklisted) {
                    throw new TokenRevokedError();
                }
            } catch (redisError) {
                // Re-throw intentional revocations (not Redis infrastructure failures)
                if (redisError instanceof TokenRevokedError) {
                    throw redisError;
                }
                // Fail-closed: if Redis is unavailable, reject the token for safety.
                // A revoked token must never be accepted due to infrastructure failure.
                console.error('Redis blacklist check unavailable — rejecting token for safety:', redisError);
                throw new HttpError(
                    HttpStatusCode.SERVICE_UNAVAILABLE,
                    'Token verification unavailable — please try again later'
                );
            }

            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            } else if (error instanceof jwt.NotBeforeError) {
                throw new Error('Token not active yet');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error(`JWT verification failed: ${error.message}`);
            } else {
                throw error;
            }
        }
    }

    async verifyAccessToken(token: string): Promise<TokenPayload> {
        this.ensureInitialized();
        try {
            return await this.verifyToken(token, this.accessTokenSecret!);
        } catch (error: unknown) {
            // Preserve TokenRevokedError so errorHandler can map it to 401
            if (error instanceof TokenRevokedError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Invalid or expired access token: ${message}`);
        }
    }

    async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
        this.ensureInitialized();
        try {
            const payload = (await this.verifyToken(token, this.refreshTokenSecret!)) as RefreshTokenPayload;

            if (payload.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            // Verify token exists in Redis
            const refreshTokenKey = `refresh_token:${payload.userId}`;
            const storedToken = await this.redis.get(refreshTokenKey);

            if (!storedToken || storedToken !== token) {
                throw new Error('Refresh token not found or invalid');
            }

            return payload;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Invalid or expired refresh token: ${message}`);
        }
    }

    async refreshTokens(refreshToken: string): Promise<TokenPair> {
        const payload = await this.verifyRefreshToken(refreshToken);

        // Blacklist old refresh token and revoke stored entry
        await Promise.all([this.blacklistToken(refreshToken), this.revokeRefreshToken(payload.userId)]);

        // Generate new token pair
        return this.generateTokenPair({
            userId: payload.userId,
            email: payload.email,
            ...(payload.role && { role: payload.role }),
        });
    }

    async blacklistToken(token: string): Promise<void> {
        let blacklistKey: string;
        let ttl = 3600; // Default: 1 hour

        try {
            const decoded = jwt.decode(token) as { exp?: number; jti?: string } | null;
            if (decoded?.jti) {
                blacklistKey = `blacklist:${decoded.jti}`;
            } else {
                const tokenHash = createHash('sha256').update(token).digest('hex');
                blacklistKey = `blacklist:hash:${tokenHash}`;
                logger.warn('blacklistToken: token missing jti — using SHA-256 hash as fallback key');
            }
            if (decoded?.exp) {
                const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
                ttl = Math.max(expirationTime, 3600);
            }
        } catch {
            // jwt.decode failed (malformed token) — fall back to SHA-256 hash
            const tokenHash = createHash('sha256').update(token).digest('hex');
            blacklistKey = `blacklist:hash:${tokenHash}`;
        }

        // Fail-closed: if Redis is unavailable this will throw. The logout controller
        // handles this with a best-effort catch so the client session still ends.
        await this.redis.setex(blacklistKey, ttl, 'revoked');
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        try {
            const decoded = jwt.decode(token) as { jti?: string } | null;
            if (decoded?.jti) {
                const result = await this.redis.get(`blacklist:${decoded.jti}`);
                return result !== null;
            }
        } catch {
            // jwt.decode failed — fall through to hash check
        }
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const result = await this.redis.get(`blacklist:hash:${tokenHash}`);
        return result !== null;
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        const refreshTokenKey = `refresh_token:${userId}`;
        await this.redis.del(refreshTokenKey);
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        await this.revokeRefreshToken(userId);

        // Mark all access tokens for this user as revoked
        const userTokenKey = `user_tokens:${userId}`;
        await this.redis.setex(userTokenKey, 24 * 60 * 60, 'revoked');
    }

    async isUserTokensRevoked(userId: string): Promise<boolean> {
        const userTokenKey = `user_tokens:${userId}`;
        const result = await this.redis.get(userTokenKey);
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
     * Removes blacklist entries that have no TTL set (should not normally
     * happen, but provides a safety net for manual admin operations).
     * Redis auto-expires entries with a TTL, so this only targets the edge
     * case where setex was bypassed.
     */
    async cleanup(): Promise<void> {
        let cursor = '0';
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', 'blacklist:*', 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const ttl = await this.redis.ttl(key);
                if (ttl === -1) {
                    // Key exists but has no TTL — remove it
                    await this.redis.del(key);
                }
            }
        } while (cursor !== '0');
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
