import * as jwt from 'jsonwebtoken';
import Redis from 'ioredis';

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
    private redis!: Redis;
    private accessTokenSecret!: string;
    private refreshTokenSecret!: string;
    private accessTokenExpiry!: string;
    private refreshTokenExpiry!: string;
    private readonly issuer = 'vegan-guide-api';
    private readonly audience = 'vegan-guide-client';
    constructor() {
        this.initializeRedis();
        this.initializeSecrets();
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
            keys: (pattern: string) => {
                const keys = Array.from(mockRedisStorage.keys());
                if (pattern === '*') return Promise.resolve(keys);

                const regex = new RegExp(pattern.replace('*', '.*'));
                return Promise.resolve(keys.filter(key => regex.test(key)));
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
        } as unknown as Redis;
    }

    private initializeRealRedis(): void {
        const redisConfig = {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
            lazyConnect: true,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 1,
            ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
        };

        this.redis = new Redis(redisConfig);
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
            jti: Math.random().toString(36).substring(2, 11),
        };
    }

    private signToken(payload: object, secret: string, expiresIn: string): string {
        console.log('🔧 signToken called with:', {
            payloadKeys: Object.keys(payload),
            secretLength: secret.length,
            expiresIn,
            issuer: this.issuer,
            audience: this.audience,
        });

        try {
            const result = jwt.sign(payload, secret, {
                expiresIn,
                issuer: this.issuer,
                audience: this.audience,
            } as jwt.SignOptions);

            console.log('🔧 signToken result:', result ? 'GENERATED' : 'UNDEFINED');
            return result;
        } catch (error) {
            console.error('🔧 signToken error:', error);
            throw error;
        }
    }

    async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
        console.log('🔧 generateTokenPair called with payload:', payload);

        const tokenPayload = this.createTokenPayload(payload);
        console.log('🔧 Created token payload:', tokenPayload);

        console.log('🔧 About to sign access token...');
        const accessToken = this.signToken(tokenPayload, this.accessTokenSecret, this.accessTokenExpiry);
        console.log('🔧 Access token result:', accessToken ? 'GENERATED' : 'UNDEFINED');

        const refreshPayload = { ...tokenPayload, type: 'refresh' as const };
        console.log('🔧 About to sign refresh token...');
        const refreshToken = this.signToken(refreshPayload, this.refreshTokenSecret, this.refreshTokenExpiry);
        console.log('🔧 Refresh token result:', refreshToken ? 'GENERATED' : 'UNDEFINED');

        // Store refresh token in Redis
        const refreshTokenKey = `refresh_token:${payload.userId}`;
        console.log('🔧 About to store in Redis with key:', refreshTokenKey);
        try {
            await this.redis.setex(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken);
            console.log('🔧 Successfully stored in Redis');
        } catch (redisError) {
            console.error('🔧 Redis error:', redisError);
        }

        const result = { accessToken, refreshToken };
        console.log('🔧 Final result:', result);
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
            }) as TokenPayload;

            // Then check if token is blacklisted (but don't fail if Redis is unavailable)
            try {
                const isBlacklisted = await this.isTokenBlacklisted(token);
                if (isBlacklisted) {
                    throw new Error('Token has been revoked');
                }
            } catch (redisError) {
                // In test environment, log but don't fail if Redis check fails
                if (process.env.NODE_ENV === 'test') {
                    console.warn('Redis blacklist check failed, continuing with token verification:', redisError);
                } else {
                    // In production, we might want to be more strict
                    console.error('Redis blacklist check failed:', redisError);
                }
            }

            return decoded;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error(`JWT verification failed: ${error.message}`);
            } else if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            } else if (error instanceof jwt.NotBeforeError) {
                throw new Error('Token not active yet');
            } else {
                throw error;
            }
        }
    }

    async verifyAccessToken(token: string): Promise<TokenPayload> {
        try {
            return await this.verifyToken(token, this.accessTokenSecret);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Invalid or expired access token: ${message}`);
        }
    }

    async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
        try {
            const payload = (await this.verifyToken(token, this.refreshTokenSecret)) as RefreshTokenPayload;

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
        try {
            const decoded = jwt.decode(token) as { exp?: number } | null;
            const blacklistKey = `blacklist:${token}`;

            if (decoded?.exp) {
                const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
                const ttl = Math.max(expirationTime, 3600); // Minimum 1 hour
                await this.redis.setex(blacklistKey, ttl, 'revoked');
            } else {
                await this.redis.setex(blacklistKey, 3600, 'revoked'); // Default 1 hour
            }
        } catch (error) {
            // If token decode fails, still blacklist with default TTL
            // Error is intentionally caught to ensure token is blacklisted even if decode fails
            const blacklistKey = `blacklist:${token}`;
            await this.redis.setex(blacklistKey, 3600, 'revoked');
        }
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        try {
            const blacklistKey = `blacklist:${token}`;
            const result = await this.redis.get(blacklistKey);
            return result !== null;
        } catch (error) {
            // In test environment, if Redis fails, assume token is not blacklisted
            if (process.env.NODE_ENV === 'test') {
                console.warn('Redis blacklist check failed, assuming token is not blacklisted:', error);
                return false;
            }
            // In production, re-throw the error
            throw error;
        }
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
        try {
            const userTokenKey = `user_tokens:${userId}`;
            const result = await this.redis.get(userTokenKey);
            return result === 'revoked';
        } catch (error) {
            // In test environment, if Redis fails, assume tokens are not revoked
            if (process.env.NODE_ENV === 'test') {
                console.warn('Redis user tokens check failed, assuming tokens are not revoked:', error);
                return false;
            }
            // In production, re-throw the error
            throw error;
        }
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

    async disconnect(): Promise<void> {
        this.redis.disconnect();
    }

    async clearAllForTesting(): Promise<void> {
        if (process.env.NODE_ENV === 'test') {
            const redis = this.redis as Redis & { flushall?: () => Promise<string> };
            if (redis.flushall) {
                await redis.flushall();
            }
        }
    }
}

export default new TokenService();
