import type { Redis as RedisType } from 'ioredis';
import logger from '../utils/logger.js';
import { executeIfCircuitClosed, getRedisClient } from '../clients/redisClient.js';
import type { TokenPayload, TokenPair, RefreshTokenPayload, TokenInfo } from './tokenService/tokenTypes.js';
import { JWT_CONFIG, REDIS_KEY_PATTERNS, TOKEN_TTL } from './tokenService/tokenTypes.js';
import { createMockRedis } from './tokenService/mockRedis.js';
import { createTokenPayload, signToken, debugLog, debugError } from './tokenService/tokenGeneration.js';
import {
    buildVerifyToken,
    verifyAccessTokenImpl,
    verifyRefreshTokenImpl,
    refreshTokensImpl,
} from './tokenService/tokenVerification.js';
import {
    blacklistToken,
    isTokenBlacklisted,
    revokeRefreshToken,
    revokeRefreshTokenByKey,
    revokeAllUserTokens,
    isUserTokensRevoked,
    getTokenInfo,
    cleanup,
} from './tokenService/tokenBlacklist.js';

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
            revokeRefreshTokenByKey,
            this.executeRedis.bind(this),
            this.redis
        );
    }

    async blacklistToken(token: string): Promise<void> {
        return blacklistToken(token, this.executeRedis.bind(this), this.redis);
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        return isTokenBlacklisted(token, this.executeRedis.bind(this), this.redis);
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        return revokeRefreshToken(userId, this.executeRedis.bind(this), this.redis);
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        return revokeAllUserTokens(userId, this.executeRedis.bind(this), this.redis, uid =>
            this.revokeRefreshToken(uid)
        );
    }

    async isUserTokensRevoked(userId: string): Promise<boolean> {
        return isUserTokensRevoked(userId, this.executeRedis.bind(this), this.redis);
    }

    async getTokenInfo(token: string): Promise<TokenInfo> {
        return getTokenInfo(token);
    }

    async cleanup(): Promise<number> {
        return cleanup(this.executeRedis.bind(this), this.redis);
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
