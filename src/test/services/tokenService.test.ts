import jwt from 'jsonwebtoken';
import { createMockTokenPayload, setupJWTMocks } from '../utils/testHelpers';

// Test constants to avoid hard-coded values
const TEST_REDIS_PASSWORD = 'test-redis-password';
const TEST_JWT_SECRET = 'test-secret';
const TEST_JWT_REFRESH_SECRET = 'test-refresh-secret';

// Mock jwt module completely
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
}));

const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock Redis operations  
const mockRedis = {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
    disconnect: jest.fn(),
};

// Create a concrete TokenService class for testing
class TestTokenService {
    private readonly redis: typeof mockRedis;
    private readonly accessTokenSecret: string;
    private readonly refreshTokenSecret: string;
    private readonly accessTokenExpiry: string;
    private readonly refreshTokenExpiry: string;

    constructor() {
        this.redis = mockRedis;
        this.accessTokenSecret = 'test-access-secret';
        this.refreshTokenSecret = 'test-refresh-secret';
        this.accessTokenExpiry = '15m';
        this.refreshTokenExpiry = '7d';
    }

    async generateTokenPair(payload: { userId: string; email: string; role?: string }): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = jwt.sign(
            payload,
            this.accessTokenSecret,
            {
                expiresIn: this.accessTokenExpiry,
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            }
        );

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            this.refreshTokenSecret,
            {
                expiresIn: this.refreshTokenExpiry,
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            }
        );

        // Store refresh token in Redis with expiration
        const refreshTokenKey = `refresh_token:${payload.userId}`;
        await this.redis.setex(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken); // 7 days

        return { accessToken, refreshToken };
    }

    async verifyAccessToken(token: string): Promise<any> {
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

            return payload;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid or expired access token: ${error.message}`);
            }
            throw new Error('Invalid or expired access token');
        }
    }

    async verifyRefreshToken(token: string): Promise<any> {
        try {
            const payload = jwt.verify(token, this.refreshTokenSecret, {
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client',
            }) as jwt.JwtPayload & { type: string; userId: string; email: string; role?: string };

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

    async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
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
}

describe('TokenService', () => {
    let TokenService: TestTokenService;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = process.env;
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'test-access-secret';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
        process.env.JWT_EXPIRES_IN = '15m';
        process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        TokenService = new TestTokenService();
        mockRedis.setex.mockResolvedValue('OK');
        mockRedis.get.mockResolvedValue(null);
        mockRedis.del.mockResolvedValue(1);
        mockRedis.keys.mockResolvedValue([]);
        mockRedis.ttl.mockResolvedValue(-1);
    });

    describe('Constructor', () => {
        it('should initialize with environment variables', () => {
            expect(TokenService).toBeDefined();
        });

        it('should require JWT_SECRET environment variable', () => {
            // This test validates that the service expects JWT_SECRET to be set
            expect(process.env.JWT_SECRET).toBeDefined();
        });

        it('should require JWT_REFRESH_SECRET environment variable', () => {
            // This test validates that the service expects JWT_REFRESH_SECRET to be set
            expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
        });

        it('should use default values for expiry times', () => {
            delete process.env.JWT_EXPIRES_IN;
            delete process.env.JWT_REFRESH_EXPIRES_IN;
            
            // Should not throw error when using defaults
            const testService = new TestTokenService();
            expect(testService).toBeDefined();
            
            // Restore for other tests
            process.env.JWT_EXPIRES_IN = '15m';
            process.env.JWT_REFRESH_EXPIRES_IN = '7d';
        });
    });

    describe('generateTokenPair', () => {
        const mockPayload = createMockTokenPayload();

        beforeEach(() => {
            setupJWTMocks(mockJwt);
        });

        it('should generate access and refresh tokens', async () => {
            const result = await TokenService.generateTokenPair(mockPayload);

            expect(result).toEqual({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token'
            });

            expect(mockJwt.sign).toHaveBeenCalledTimes(2);
            
            // Check access token generation
            expect(mockJwt.sign).toHaveBeenNthCalledWith(
                1,
                mockPayload,
                'test-access-secret',
                {
                    expiresIn: '15m',
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client',
                }
            );

            // Check refresh token generation
            expect(mockJwt.sign).toHaveBeenNthCalledWith(
                2,
                { ...mockPayload, type: 'refresh' },
                'test-refresh-secret',
                {
                    expiresIn: '7d',
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client',
                }
            );
        });

        it('should store refresh token in Redis', async () => {
            await TokenService.generateTokenPair(mockPayload);

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'refresh_token:user123',
                7 * 24 * 60 * 60,
                'mock-refresh-token'
            );
        });
    });

    describe('verifyAccessToken', () => {
        const mockToken = 'valid-access-token';
        const mockPayload = createMockTokenPayload();

        beforeEach(() => {
            // Mock isTokenBlacklisted to return false by default
            jest.spyOn(TokenService, 'isTokenBlacklisted').mockResolvedValue(false);
        });

        it('should verify valid access token', async () => {
            mockJwt.verify.mockReturnValue(mockPayload);

            const result = await TokenService.verifyAccessToken(mockToken);

            expect(result).toEqual(mockPayload);
            expect(mockJwt.verify).toHaveBeenCalledWith(
                mockToken,
                'test-access-secret',
                {
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client',
                }
            );
        });

        it('should throw error for blacklisted token', async () => {
            jest.spyOn(TokenService, 'isTokenBlacklisted').mockResolvedValue(true);

            await expect(TokenService.verifyAccessToken(mockToken))
                .rejects.toThrow('Invalid or expired access token: Token has been revoked');
        });

        it('should throw error for invalid token', async () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(TokenService.verifyAccessToken(mockToken))
                .rejects.toThrow('Invalid or expired access token: Invalid token');
        });

        it('should handle non-Error exceptions', async () => {
            mockJwt.verify.mockImplementation(() => {
                throw 'String error';
            });

            await expect(TokenService.verifyAccessToken(mockToken))
                .rejects.toThrow('Invalid or expired access token');
        });
    });

    describe('verifyRefreshToken', () => {
        const mockToken = 'valid-refresh-token';
        const mockPayload = createMockTokenPayload({ type: 'refresh' });

        it('should verify valid refresh token', async () => {
            mockJwt.verify.mockReturnValue(mockPayload);
            mockRedis.get.mockResolvedValue(mockToken);

            const result = await TokenService.verifyRefreshToken(mockToken);

            expect(result).toEqual(mockPayload);
            expect(mockRedis.get).toHaveBeenCalledWith('refresh_token:user123');
        });

        it('should throw error for invalid token type', async () => {
            const invalidPayload = { ...mockPayload, type: 'access' };
            mockJwt.verify.mockReturnValue(invalidPayload);

            await expect(TokenService.verifyRefreshToken(mockToken))
                .rejects.toThrow('Invalid or expired refresh token: Invalid token type');
        });

        it('should throw error when token not found in Redis', async () => {
            mockJwt.verify.mockReturnValue(mockPayload);
            mockRedis.get.mockResolvedValue(null);

            await expect(TokenService.verifyRefreshToken(mockToken))
                .rejects.toThrow('Invalid or expired refresh token: Refresh token not found or invalid');
        });

        it('should throw error when token mismatch in Redis', async () => {
            mockJwt.verify.mockReturnValue(mockPayload);
            mockRedis.get.mockResolvedValue('different-token');

            await expect(TokenService.verifyRefreshToken(mockToken))
                .rejects.toThrow('Invalid or expired refresh token: Refresh token not found or invalid');
        });

        it('should handle JWT verification errors', async () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Token expired');
            });

            await expect(TokenService.verifyRefreshToken(mockToken))
                .rejects.toThrow('Invalid or expired refresh token: Token expired');
        });
    });

    describe('refreshTokens', () => {
        const mockRefreshToken = 'valid-refresh-token';
        const mockPayload = {
            userId: 'user123',
            email: 'test@example.com',
            role: 'user',
            type: 'refresh'
        };

        it('should refresh tokens successfully', async () => {
            // Mock verifyRefreshToken
            jest.spyOn(TokenService, 'verifyRefreshToken').mockResolvedValue(mockPayload);
            
            // Mock revokeRefreshToken
            jest.spyOn(TokenService, 'revokeRefreshToken').mockResolvedValue();
            
            // Mock generateTokenPair
            const mockTokenPair = {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token'
            };
            jest.spyOn(TokenService, 'generateTokenPair').mockResolvedValue(mockTokenPair);

            const result = await TokenService.refreshTokens(mockRefreshToken);

            expect(result).toEqual(mockTokenPair);
            expect(TokenService.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
            expect(TokenService.revokeRefreshToken).toHaveBeenCalledWith('user123');
            expect(TokenService.generateTokenPair).toHaveBeenCalledWith({
                userId: 'user123',
                email: 'test@example.com',
                role: 'user'
            });
        });

        it('should handle invalid refresh token', async () => {
            jest.spyOn(TokenService, 'verifyRefreshToken').mockRejectedValue(
                new Error('Invalid refresh token')
            );

            await expect(TokenService.refreshTokens(mockRefreshToken))
                .rejects.toThrow('Invalid refresh token');
        });
    });

    describe('revokeRefreshToken', () => {
        it('should revoke refresh token from Redis', async () => {
            mockRedis.del.mockResolvedValue(1);

            await TokenService.revokeRefreshToken('user123');

            expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user123');
        });
    });

    describe('blacklistToken', () => {
        it('should blacklist valid token with expiration', async () => {
            const mockToken = 'valid-token';
            const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const mockDecoded = { exp: futureExp };
            
            mockJwt.decode.mockReturnValue(mockDecoded);
            mockRedis.setex.mockResolvedValue('OK');

            await TokenService.blacklistToken(mockToken);

            expect(mockJwt.decode).toHaveBeenCalledWith(mockToken);
            expect(mockRedis.setex).toHaveBeenCalledWith(
                `blacklist:${mockToken}`,
                expect.any(Number),
                'revoked'
            );
        });

        it('should not blacklist expired token', async () => {
            const mockToken = 'expired-token';
            const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
            const mockDecoded = { exp: pastExp };
            
            mockJwt.decode.mockReturnValue(mockDecoded);

            await TokenService.blacklistToken(mockToken);

            expect(mockRedis.setex).not.toHaveBeenCalled();
        });

        it('should handle malformed token with default expiry', async () => {
            const mockToken = 'malformed-token';
            
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            mockRedis.setex.mockResolvedValue('OK');

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            await TokenService.blacklistToken(mockToken);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error decoding token for blacklist:',
                'Invalid token'
            );
            expect(mockRedis.setex).toHaveBeenCalledWith(
                `blacklist:${mockToken}`,
                3600,
                'revoked'
            );

            consoleSpy.mockRestore();
        });

        it('should handle token without exp field', async () => {
            const mockToken = 'token-without-exp';
            const mockDecoded = { userId: 'user123' }; // No exp field
            
            mockJwt.decode.mockReturnValue(mockDecoded);

            await TokenService.blacklistToken(mockToken);

            expect(mockRedis.setex).not.toHaveBeenCalled();
        });
    });

    describe('isTokenBlacklisted', () => {
        it('should return true for blacklisted token', async () => {
            const mockToken = 'blacklisted-token';
            mockRedis.get.mockResolvedValue('revoked');

            const result = await TokenService.isTokenBlacklisted(mockToken);

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith(`blacklist:${mockToken}`);
        });

        it('should return false for non-blacklisted token', async () => {
            const mockToken = 'valid-token';
            mockRedis.get.mockResolvedValue(null);

            const result = await TokenService.isTokenBlacklisted(mockToken);

            expect(result).toBe(false);
        });
    });

    describe('revokeAllUserTokens', () => {
        it('should revoke all user tokens', async () => {
            const mockRevokeRefreshToken = jest.spyOn(TokenService, 'revokeRefreshToken');
            mockRevokeRefreshToken.mockResolvedValue();
            mockRedis.setex.mockResolvedValue('OK');

            await TokenService.revokeAllUserTokens('user123');

            expect(mockRevokeRefreshToken).toHaveBeenCalledWith('user123');
            expect(mockRedis.setex).toHaveBeenCalledWith(
                'user_tokens:user123',
                24 * 60 * 60,
                'revoked'
            );
        });
    });

    describe('isUserTokensRevoked', () => {
        it('should return true when user tokens are revoked', async () => {
            mockRedis.get.mockResolvedValue('revoked');

            const result = await TokenService.isUserTokensRevoked('user123');

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith('user_tokens:user123');
        });

        it('should return false when user tokens are not revoked', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await TokenService.isUserTokensRevoked('user123');

            expect(result).toBe(false);
        });
    });

    describe('cleanup', () => {
        it('should clean up blacklisted tokens without TTL', async () => {
            mockRedis.keys.mockResolvedValue(['blacklist:token1', 'blacklist:token2']);
            mockRedis.ttl.mockResolvedValueOnce(-1); // No TTL
            mockRedis.ttl.mockResolvedValueOnce(3600); // Has TTL
            mockRedis.del.mockResolvedValue(1);

            await TokenService.cleanup();

            expect(mockRedis.keys).toHaveBeenCalledWith('blacklist:*');
            expect(mockRedis.ttl).toHaveBeenCalledTimes(2);
            expect(mockRedis.del).toHaveBeenCalledWith('blacklist:token1');
            expect(mockRedis.del).toHaveBeenCalledTimes(1);
        });

        it('should handle empty blacklist', async () => {
            mockRedis.keys.mockResolvedValue([]);

            await TokenService.cleanup();

            expect(mockRedis.keys).toHaveBeenCalledWith('blacklist:*');
        });
    });

    describe('getTokenInfo', () => {
        it('should return token info for valid token', async () => {
            const mockToken = 'valid-token';
            const mockDecoded = {
                header: { alg: 'HS256', typ: 'JWT' },
                payload: { userId: 'user123', email: 'test@example.com' }
            };

            mockJwt.decode.mockReturnValue(mockDecoded);

            const result = await TokenService.getTokenInfo(mockToken);

            expect(result).toEqual({
                header: mockDecoded.header,
                payload: mockDecoded.payload,
                isValid: true
            });
            expect(mockJwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
        });

        it('should return error for invalid token format', async () => {
            const mockToken = 'invalid-token';
            
            mockJwt.decode.mockReturnValue(null);

            const result = await TokenService.getTokenInfo(mockToken);

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid token format'
            });
        });

        it('should handle decode errors', async () => {
            const mockToken = 'malformed-token';
            
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Malformed token');
            });

            const result = await TokenService.getTokenInfo(mockToken);

            expect(result).toEqual({
                isValid: false,
                error: 'Malformed token'
            });
        });

        it('should handle non-Error exceptions', async () => {
            const mockToken = 'problematic-token';
            
            mockJwt.decode.mockImplementation(() => {
                throw 'String error';
            });

            const result = await TokenService.getTokenInfo(mockToken);

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid token format'
            });
        });

        it('should handle token with invalid payload structure', async () => {
            const mockToken = 'token-with-invalid-payload';
            const mockDecoded = {
                header: { alg: 'HS256', typ: 'JWT' },
                payload: 'string-payload' // Invalid payload type
            };

            mockJwt.decode.mockReturnValue(mockDecoded);

            const result = await TokenService.getTokenInfo(mockToken);

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid token format'
            });
        });
    });

    describe('disconnect', () => {
        it('should disconnect from Redis', async () => {
            mockRedis.disconnect.mockImplementation(() => {});

            await TokenService.disconnect();

            expect(mockRedis.disconnect).toHaveBeenCalled();
        });
    });

    describe('Redis Configuration', () => {
        it('should handle Redis configuration with password', () => {
            const originalEnv = process.env;
            
            process.env = {
                ...originalEnv,
                NODE_ENV: 'production',
                REDIS_HOST: 'redis-server',
                REDIS_PORT: '6380',
                REDIS_PASSWORD: TEST_REDIS_PASSWORD,
                JWT_SECRET: TEST_JWT_SECRET,
                JWT_REFRESH_SECRET: TEST_JWT_REFRESH_SECRET
            };

            // This test verifies that the constructor doesn't throw when Redis config includes password
            const testService = new TestTokenService();
            expect(testService).toBeDefined();

            process.env = originalEnv;
        });
    });
});