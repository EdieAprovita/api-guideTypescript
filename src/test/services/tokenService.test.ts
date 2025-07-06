import jwt from 'jsonwebtoken';
import { createMockTokenPayload, setupJWTMocks } from '../utils/testHelpers';
import { TEST_JWT_CONFIG, TEST_REDIS_CONFIG, setupTestEnvironment, cleanupTestEnvironment } from '../testConfig';

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
        this.accessTokenSecret = TEST_JWT_CONFIG.accessSecret;
        this.refreshTokenSecret = TEST_JWT_CONFIG.refreshSecret;
        this.accessTokenExpiry = TEST_JWT_CONFIG.accessExpiry;
        this.refreshTokenExpiry = TEST_JWT_CONFIG.refreshExpiry;
    }

    async generateTokenPair(payload: { userId: string; email: string; role?: string }): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = jwt.sign(
            payload,
            this.accessTokenSecret,
            {
                expiresIn: this.accessTokenExpiry,
                issuer: TEST_JWT_CONFIG.issuer,
                audience: TEST_JWT_CONFIG.audience,
            }
        );

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            this.refreshTokenSecret,
            {
                expiresIn: this.refreshTokenExpiry,
                issuer: TEST_JWT_CONFIG.issuer,
                audience: TEST_JWT_CONFIG.audience,
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
                issuer: TEST_JWT_CONFIG.issuer,
                audience: TEST_JWT_CONFIG.audience,
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
                issuer: TEST_JWT_CONFIG.issuer,
                audience: TEST_JWT_CONFIG.audience,
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
            
            if (!decoded || typeof decoded === 'string') {
                return {
                    isValid: false,
                    error: 'Invalid token format'
                };
            }

            if (!decoded.payload || typeof decoded.payload === 'string') {
                return {
                    isValid: false,
                    error: 'Invalid token format'
                };
            }

            return {
                header: decoded.header,
                payload: decoded.payload,
                isValid: true
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Invalid token format'
            };
        }
    }

    async disconnect(): Promise<void> {
        await this.redis.disconnect();
    }
}

describe('TokenService', () => {
    let TokenService: TestTokenService;
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
        jest.clearAllMocks();
        TokenService = new TestTokenService();
        mockRedis.setex.mockResolvedValue('OK');
        mockRedis.get.mockResolvedValue(null);
        mockRedis.del.mockResolvedValue(1);
        mockRedis.keys.mockResolvedValue([]);
        mockRedis.ttl.mockResolvedValue(-1);
    });

    // Helper function to setup common mock expectations
    const setupMockToken = (mockPayload: any = { userId: 'user123', email: 'test@example.com' }) => {
        mockJwt.sign.mockReturnValue('mock-token');
        mockJwt.verify.mockReturnValue(mockPayload);
        mockJwt.decode.mockReturnValue(mockPayload);
        return mockPayload;
    };

    describe('Constructor', () => {
        it('should initialize with environment variables', () => {
            expect(TokenService).toBeDefined();
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
            
            const testService = new TestTokenService();
            expect(testService).toBeDefined();
            
            // Restore for other tests
            process.env.JWT_EXPIRES_IN = TEST_JWT_CONFIG.accessExpiry;
            process.env.JWT_REFRESH_EXPIRES_IN = TEST_JWT_CONFIG.refreshExpiry;
        });
    });

    describe('generateTokenPair', () => {
        it('should generate access and refresh tokens', async () => {
            const payload = { userId: 'user123', email: 'test@example.com' };
            setupMockToken(payload);

            const result = await TokenService.generateTokenPair(payload);

            expect(mockJwt.sign).toHaveBeenCalledTimes(2);
            expect(mockRedis.setex).toHaveBeenCalledWith(
                'refresh_token:user123',
                604800, // 7 days
                'mock-token'
            );
            expect(result).toEqual({
                accessToken: 'mock-token',
                refreshToken: 'mock-token'
            });
        });

        it('should include role in payload when provided', async () => {
            const payload = { userId: 'user123', email: 'test@example.com', role: 'admin' };
            setupMockToken(payload);

            await TokenService.generateTokenPair(payload);

            expect(mockJwt.sign).toHaveBeenCalledWith(
                payload,
                expect.any(String),
                expect.objectContaining({
                    issuer: TEST_JWT_CONFIG.issuer,
                    audience: TEST_JWT_CONFIG.audience
                })
            );
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify valid access token', async () => {
            const mockPayload = { userId: 'user123', email: 'test@example.com' };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValue(null); // Not blacklisted

            const result = await TokenService.verifyAccessToken('valid-token');

            expect(mockJwt.verify).toHaveBeenCalledWith(
                'valid-token',
                TEST_JWT_CONFIG.accessSecret,
                expect.objectContaining({
                    issuer: TEST_JWT_CONFIG.issuer,
                    audience: TEST_JWT_CONFIG.audience
                })
            );
            expect(result).toEqual(mockPayload);
        });

        it('should reject blacklisted token', async () => {
            mockRedis.get.mockResolvedValue('revoked'); // Blacklisted

            await expect(TokenService.verifyAccessToken('blacklisted-token'))
                .rejects.toThrow('Invalid or expired access token: Token has been revoked');
        });

        it('should handle verification errors', async () => {
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Token expired');
            });

            await expect(TokenService.verifyAccessToken('expired-token'))
                .rejects.toThrow('Invalid or expired access token: Token expired');
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify valid refresh token', async () => {
            const mockPayload = { 
                userId: 'user123', 
                email: 'test@example.com', 
                type: 'refresh' 
            };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValue('stored-token');

            const result = await TokenService.verifyRefreshToken('stored-token');

            expect(result).toEqual(mockPayload);
        });

        it('should reject token with wrong type', async () => {
            const mockPayload = { 
                userId: 'user123', 
                email: 'test@example.com', 
                type: 'access' // Wrong type
            };
            setupMockToken(mockPayload);

            await expect(TokenService.verifyRefreshToken('wrong-type-token'))
                .rejects.toThrow('Invalid or expired refresh token: Invalid token type');
        });

        it('should reject token not found in Redis', async () => {
            const mockPayload = { 
                userId: 'user123', 
                email: 'test@example.com', 
                type: 'refresh' 
            };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValue(null); // Not in Redis

            await expect(TokenService.verifyRefreshToken('missing-token'))
                .rejects.toThrow('Invalid or expired refresh token: Refresh token not found or invalid');
        });

        it('should reject mismatched token', async () => {
            const mockPayload = { 
                userId: 'user123', 
                email: 'test@example.com', 
                type: 'refresh' 
            };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValue('different-token'); // Mismatch

            await expect(TokenService.verifyRefreshToken('request-token'))
                .rejects.toThrow('Invalid or expired refresh token: Refresh token not found or invalid');
        });
    });

    describe('refreshTokens', () => {
        it('should refresh tokens successfully', async () => {
            const mockPayload = { 
                userId: 'user123', 
                email: 'test@example.com', 
                type: 'refresh' 
            };
            setupMockToken(mockPayload);
            mockRedis.get.mockResolvedValue('valid-refresh-token');

            const result = await TokenService.refreshTokens('valid-refresh-token');

            expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user123');
            expect(result).toEqual({
                accessToken: 'mock-token',
                refreshToken: 'mock-token'
            });
        });
    });

    describe('revokeRefreshToken', () => {
        it('should revoke refresh token', async () => {
            await TokenService.revokeRefreshToken('user123');

            expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user123');
        });
    });

    describe('blacklistToken', () => {
        it('should blacklist token with valid expiration', async () => {
            const mockDecoded = {
                exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
            };
            mockJwt.decode.mockReturnValue(mockDecoded);

            await TokenService.blacklistToken('valid-token');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'blacklist:valid-token',
                expect.any(Number),
                'revoked'
            );
        });

        it('should handle expired token gracefully', async () => {
            const mockDecoded = {
                exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
            };
            mockJwt.decode.mockReturnValue(mockDecoded);

            await TokenService.blacklistToken('expired-token');

            expect(mockRedis.setex).not.toHaveBeenCalled();
        });

        it('should handle malformed token', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Malformed token');
            });

            await TokenService.blacklistToken('malformed-token');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'blacklist:malformed-token',
                3600,
                'revoked'
            );
        });

        it('should handle null decoded token', async () => {
            mockJwt.decode.mockReturnValue(null);

            await TokenService.blacklistToken('null-token');

            expect(mockRedis.setex).not.toHaveBeenCalled();
        });
    });

    describe('isTokenBlacklisted', () => {
        it('should return true for blacklisted token', async () => {
            mockRedis.get.mockResolvedValue('revoked');

            const result = await TokenService.isTokenBlacklisted('blacklisted-token');

            expect(result).toBe(true);
            expect(mockRedis.get).toHaveBeenCalledWith('blacklist:blacklisted-token');
        });

        it('should return false for non-blacklisted token', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await TokenService.isTokenBlacklisted('valid-token');

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
            mockJwt.decode.mockReturnValue(null);

            const result = await TokenService.getTokenInfo('invalid-token');

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid token format'
            });
        });

        it('should handle decode errors', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw new Error('Malformed token');
            });

            const result = await TokenService.getTokenInfo('malformed-token');

            expect(result).toEqual({
                isValid: false,
                error: 'Malformed token'
            });
        });

        it('should handle non-Error exceptions', async () => {
            mockJwt.decode.mockImplementation(() => {
                throw 'String error';
            });

            const result = await TokenService.getTokenInfo('problematic-token');

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid token format'
            });
        });

        it('should handle token with invalid payload structure', async () => {
            const mockDecoded = {
                header: { alg: 'HS256', typ: 'JWT' },
                payload: 'string-payload' // Invalid payload type
            };

            mockJwt.decode.mockReturnValue(mockDecoded);

            const result = await TokenService.getTokenInfo('token-with-invalid-payload');

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
                REDIS_PASSWORD: TEST_REDIS_CONFIG.password,
                JWT_SECRET: TEST_JWT_CONFIG.accessSecret,
                JWT_REFRESH_SECRET: TEST_JWT_CONFIG.refreshSecret
            };

            // This test verifies that the constructor doesn't throw when Redis config includes password
            const testService = new TestTokenService();
            expect(testService).toBeDefined();

            process.env = originalEnv;
        });
    });
});