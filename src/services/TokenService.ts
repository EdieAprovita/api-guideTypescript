import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

interface TokenPayload {
    userId: string;
    email: string;
    role?: string | undefined;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

class TokenService {
    private readonly redis: Redis;
    private readonly accessTokenSecret: string;
    private readonly refreshTokenSecret: string;
    private readonly accessTokenExpiry: string;
    private readonly refreshTokenExpiry: string;

    constructor() {
        // Only connect to Redis if not in test environment
        if (process.env.NODE_ENV !== 'test') {
            const redisConfig: {
                host: string;
                port: number;
                lazyConnect: boolean;
                retryDelayOnFailover: number;
                maxRetriesPerRequest: number;
                password?: string;
            } = {
                host: process.env.REDIS_HOST ?? 'localhost',
                port: parseInt(process.env.REDIS_PORT ?? '6379'),
                lazyConnect: true,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 1,
            };

            if (process.env.REDIS_PASSWORD) {
                redisConfig.password = process.env.REDIS_PASSWORD;
            }

            this.redis = new Redis(redisConfig);
        } else {
            // Mock Redis for tests with realistic behavior
            const mockRedisStorage = new Map<string, { value: string; expiry: number }>();
            
            this.redis = {
                setex: (key: string, seconds: number, value: string) => {
                    const expiry = Date.now() + (seconds * 1000);
                    mockRedisStorage.set(key, { value, expiry });
                    return Promise.resolve('OK');
                },
                get: (key: string) => {
                    const entry = mockRedisStorage.get(key);
                    if (!entry) return Promise.resolve(null);
                    
                    // Check if expired
                    if (Date.now() > entry.expiry) {
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
                    
                    // Simple pattern matching for blacklist:*
                    const regex = new RegExp(pattern.replace('*', '.*'));
                    return Promise.resolve(keys.filter(key => regex.test(key)));
                },
                ttl: (key: string) => {
                    const entry = mockRedisStorage.get(key);
                    if (!entry) return Promise.resolve(-2); // Key doesn't exist
                    
                    const remainingTime = Math.floor((entry.expiry - Date.now()) / 1000);
                    return Promise.resolve(remainingTime > 0 ? remainingTime : -1);
                },
                disconnect: () => {
                    mockRedisStorage.clear();
                },
                // Add method to clear storage for tests
                flushall: () => {
                    mockRedisStorage.clear();
                    return Promise.resolve('OK');
                }
            } as unknown as Redis;
        }

        this.accessTokenSecret =
            process.env.JWT_SECRET ??
            (() => {
                throw new Error('JWT_SECRET environment variable is required');
            })();
        this.refreshTokenSecret =
            process.env.JWT_REFRESH_SECRET ??
            (() => {
                throw new Error('JWT_REFRESH_SECRET environment variable is required');
            })();
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN ?? '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
    }

    async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
        const accessToken = jwt.sign(
            payload,
            this.accessTokenSecret as jwt.Secret,
            {
                expiresIn: this.accessTokenExpiry,
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            } as jwt.SignOptions
        );

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            this.refreshTokenSecret as jwt.Secret,
            {
                expiresIn: this.refreshTokenExpiry,
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            } as jwt.SignOptions
        );

        // Store refresh token in Redis with expiration
        const refreshTokenKey = `refresh_token:${payload.userId}`;
        await this.redis.setex(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken); // 7 days

        return { accessToken, refreshToken };
    }

    /**
     * Generate tokens for a user (convenience method for backward compatibility)
     * @param userId - User ID
     * @param email - User email (optional)
     * @param role - User role (optional)
     * @returns Promise<TokenPair>
     */
    async generateTokens(userId: string, email?: string, role?: string): Promise<TokenPair> {
        const payload: TokenPayload = {
            userId,
            email: email || '',
            role: role || 'user'
        };
        return this.generateTokenPair(payload);
    }

    async verifyAccessToken(token: string): Promise<TokenPayload> {
        try {
            // Check if token is blacklisted
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }

            const payload = jwt.verify(token, this.accessTokenSecret, {
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            });

            return payload as TokenPayload;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid or expired access token: ${error.message}`);
            }
            throw new Error('Invalid or expired access token');
        }
    }

    async verifyRefreshToken(token: string): Promise<TokenPayload> {
        try {
            // Check if token is blacklisted FIRST
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }

            const payload = jwt.verify(token, this.refreshTokenSecret, {
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            }) as TokenPayload & { type: string };

            if (payload.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            // Check if refresh token exists in Redis
            const refreshTokenKey = `refresh_token:${payload.userId}`;
            const storedToken = await this.redis.get(refreshTokenKey);

            if (!storedToken || storedToken !== token) {
                throw new Error('Refresh token not found or invalid');
            }

            return payload;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid or expired refresh token: ${error.message}`);
            }
            throw new Error('Invalid or expired refresh token');
        }
    }

    async refreshTokens(refreshToken: string): Promise<TokenPair> {
        const payload = await this.verifyRefreshToken(refreshToken);

        // Revoke old refresh token
        await this.revokeRefreshToken(payload.userId);

        // Generate new token pair
        return this.generateTokenPair({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        });
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        const refreshTokenKey = `refresh_token:${userId}`;
        await this.redis.del(refreshTokenKey);
    }

    async blacklistToken(token: string): Promise<void> {
        try {
            const decoded = jwt.decode(token);
            if (decoded && typeof decoded === 'object' && 'exp' in decoded && decoded.exp) {
                const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
                if (expirationTime > 0) {
                    const blacklistKey = `blacklist:${token}`;
                    await this.redis.setex(blacklistKey, expirationTime, 'revoked');
                }
            }
        } catch (error) {
            // Token might be malformed, but we still want to attempt blacklisting
            console.warn(
                'Error decoding token for blacklist:',
                error instanceof Error ? error.message : 'Unknown error'
            );
            const blacklistKey = `blacklist:${token}`;
            await this.redis.setex(blacklistKey, 3600, 'revoked'); // 1 hour default
        }
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const blacklistKey = `blacklist:${token}`;
        const result = await this.redis.get(blacklistKey);
        return result !== null;
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        // Revoke refresh token
        await this.revokeRefreshToken(userId);

        // Mark all access tokens for this user as revoked
        const userTokenKey = `user_tokens:${userId}`;
        await this.redis.setex(userTokenKey, 24 * 60 * 60, 'revoked'); // 24 hours
    }

    async isUserTokensRevoked(userId: string): Promise<boolean> {
        const userTokenKey = `user_tokens:${userId}`;
        const result = await this.redis.get(userTokenKey);
        return result === 'revoked';
    }

    async cleanup(): Promise<void> {
        // Clean up expired blacklisted tokens (Redis handles this automatically with TTL)
        // This method can be used for additional cleanup if needed
        const pattern = 'blacklist:*';
        const keys = await this.redis.keys(pattern);

        for (const key of keys) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1) {
                // Key exists but has no TTL, remove it
                await this.redis.del(key);
            }
        }
    }

    async getTokenInfo(token: string): Promise<{
        header?: jwt.JwtHeader;
        payload?: jwt.JwtPayload;
        isValid: boolean;
        error?: string;
    }> {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (decoded && typeof decoded === 'object' && 'header' in decoded && 'payload' in decoded) {
                const payload = decoded.payload;
                if (typeof payload === 'object' && payload !== null) {
                    return {
                        header: decoded.header,
                        payload: payload as jwt.JwtPayload,
                        isValid: true,
                    };
                }
            }
            return {
                isValid: false,
                error: 'Invalid token format',
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
        if (process.env.NODE_ENV === 'test' && 'flushall' in this.redis) {
            await (this.redis as any).flushall();
        }
    }
}

export default new TokenService();
