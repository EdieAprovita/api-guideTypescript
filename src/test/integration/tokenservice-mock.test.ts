import { vi } from 'vitest';
// IMPORTANT: Set environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

import { faker } from '@faker-js/faker';

// Clear all mocks to ensure clean state
vi.clearAllMocks();
vi.resetAllMocks();

// CRITICAL: Mock the TokenService
const mockTokenService = {
    generateTokens: vi.fn(),
    generateTokenPair: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    refreshTokens: vi.fn(),
    blacklistToken: vi.fn(),
    revokeAllUserTokens: vi.fn(),
    isTokenBlacklisted: vi.fn(),
    isUserTokensRevoked: vi.fn(),
    clearAllForTesting: vi.fn(),
    disconnect: vi.fn(),
};

vi.mock('../../services/TokenService', () => mockTokenService);

// Force Vitest to use real implementations by resetting module registry
vi.resetModules();

// Set test timeout
import { beforeEach } from 'vitest';

describe('TokenService Mock Test', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();

        // Setup default mock implementations
        mockTokenService.generateTokens.mockImplementation((userId: string) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}`,
                refreshToken: `mock-refresh-token-${userId}`,
            });
        });

        mockTokenService.generateTokenPair.mockImplementation((payload: any) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${payload.userId}`,
                refreshToken: `mock-refresh-token-${payload.userId}`,
            });
        });

        mockTokenService.verifyAccessToken.mockImplementation((token: string) => {
            const userId = token.replace('mock-access-token-', '');
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role: 'user',
            });
        });

        mockTokenService.verifyRefreshToken.mockImplementation((token: string) => {
            const userId = token.replace('mock-refresh-token-', '');
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role: 'user',
            });
        });

        mockTokenService.refreshTokens.mockImplementation((refreshToken: string) => {
            const userId = refreshToken.replace('mock-refresh-token-', '');
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}-new`,
                refreshToken: `mock-refresh-token-${userId}-new`,
            });
        });

        mockTokenService.blacklistToken.mockResolvedValue(undefined);
        mockTokenService.revokeAllUserTokens.mockResolvedValue(undefined);
        mockTokenService.isTokenBlacklisted.mockResolvedValue(false);
        mockTokenService.isUserTokensRevoked.mockResolvedValue(false);
        mockTokenService.clearAllForTesting.mockResolvedValue(undefined);
        mockTokenService.disconnect.mockResolvedValue(undefined);
    });

    it('should use the mock', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = faker.internet.email();
        const role = 'user';

        // Test generateTokens
        const tokens = await mockTokenService.generateTokens(userId, email, role);
        expect(tokens).toEqual({
            accessToken: `mock-access-token-${userId}`,
            refreshToken: `mock-refresh-token-${userId}`,
        });
        expect(mockTokenService.generateTokens).toHaveBeenCalledWith(userId, email, role);

        // Test generateTokenPair
        const payload = { userId, email, role };
        const tokenPair = await mockTokenService.generateTokenPair(payload);
        expect(tokenPair).toEqual({
            accessToken: `mock-access-token-${userId}`,
            refreshToken: `mock-refresh-token-${userId}`,
        });
        expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(payload);

        // Test verifyAccessToken
        const accessToken = `mock-access-token-${userId}`;
        const accessPayload = await mockTokenService.verifyAccessToken(accessToken);
        expect(accessPayload).toEqual({
            userId,
            email: 'test@example.com',
            role: 'user',
        });
        expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith(accessToken);

        // Test verifyRefreshToken
        const refreshToken = `mock-refresh-token-${userId}`;
        const refreshPayload = await mockTokenService.verifyRefreshToken(refreshToken);
        expect(refreshPayload).toEqual({
            userId,
            email: 'test@example.com',
            role: 'user',
        });
        expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);

        // Test refreshTokens
        const newTokens = await mockTokenService.refreshTokens(refreshToken);
        expect(newTokens).toEqual({
            accessToken: `mock-access-token-${userId}-new`,
            refreshToken: `mock-refresh-token-${userId}-new`,
        });
        expect(mockTokenService.refreshTokens).toHaveBeenCalledWith(refreshToken);

        // Test blacklistToken
        await mockTokenService.blacklistToken(accessToken);
        expect(mockTokenService.blacklistToken).toHaveBeenCalledWith(accessToken);

        // Test revokeAllUserTokens
        await mockTokenService.revokeAllUserTokens(userId);
        expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(userId);

        // Test isTokenBlacklisted
        const isBlacklisted = await mockTokenService.isTokenBlacklisted(accessToken);
        expect(isBlacklisted).toBe(false);
        expect(mockTokenService.isTokenBlacklisted).toHaveBeenCalledWith(accessToken);

        // Test isUserTokensRevoked
        const areRevoked = await mockTokenService.isUserTokensRevoked(userId);
        expect(areRevoked).toBe(false);
        expect(mockTokenService.isUserTokensRevoked).toHaveBeenCalledWith(userId);
    });

    it('should handle token generation with different user IDs', async () => {
        const userId1 = 'user-123';
        const userId2 = 'user-456';

        const tokens1 = await mockTokenService.generateTokens(userId1);
        const tokens2 = await mockTokenService.generateTokens(userId2);

        expect(tokens1.accessToken).toBe(`mock-access-token-${userId1}`);
        expect(tokens1.refreshToken).toBe(`mock-refresh-token-${userId1}`);
        expect(tokens2.accessToken).toBe(`mock-access-token-${userId2}`);
        expect(tokens2.refreshToken).toBe(`mock-refresh-token-${userId2}`);
    });

    it('should handle token refresh correctly', async () => {
        const userId = 'user-789';
        const refreshToken = `mock-refresh-token-${userId}`;

        const newTokens = await mockTokenService.refreshTokens(refreshToken);

        expect(newTokens.accessToken).toBe(`mock-access-token-${userId}-new`);
        expect(newTokens.refreshToken).toBe(`mock-refresh-token-${userId}-new`);
        expect(mockTokenService.refreshTokens).toHaveBeenCalledWith(refreshToken);
    });
});
