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
            const redisConfig: any = {
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
            // Mock Redis for tests
            this.redis = {
                setex: () => Promise.resolve('OK'),
                get: () => Promise.resolve(null),
                del: () => Promise.resolve(0),
                keys: () => Promise.resolve([]),
                ttl: () => Promise.resolve(-1),
                disconnect: () => {},
            } as any;
        }

        this.accessTokenSecret = process.env.JWT_SECRET ?? 'fallback-secret';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET ?? 'fallback-refresh-secret';
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
            }) as TokenPayload;

            return payload;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid or expired access token: ${error.message}`);
            }
            throw new Error('Invalid or expired access token');
        }
    }

    async verifyRefreshToken(token: string): Promise<TokenPayload> {
        try {
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
            const decoded = jwt.decode(token) as any;
            if (decoded && decoded.exp) {
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

    async getTokenInfo(token: string): Promise<any> {
        try {
            const decoded = jwt.decode(token, { complete: true });
            return {
                header: decoded?.header,
                payload: decoded?.payload,
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
}

export default new TokenService();
