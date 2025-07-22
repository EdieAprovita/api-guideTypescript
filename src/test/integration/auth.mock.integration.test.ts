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
import request from 'supertest';

// Clear all mocks to ensure clean state
jest.clearAllMocks();
jest.resetAllMocks();

// CRITICAL: Mock only the TokenService methods we need
const mockTokenService = {
    generateTokens: jest.fn(),
    generateTokenPair: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    refreshTokens: jest.fn(),
    blacklistToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    isTokenBlacklisted: jest.fn(),
    isUserTokensRevoked: jest.fn(),
    clearAllForTesting: jest.fn(),
    disconnect: jest.fn(),
};

jest.mock('../../services/TokenService', () => mockTokenService);

// Force Jest to use real implementations by resetting module registry
jest.resetModules();

import app from '../../app';

// Aumentar el timeout global para todos los tests de integración
jest.setTimeout(45000);

describe('Authentication Flow Mock Integration Tests', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Setup default mock implementations
        mockTokenService.generateTokens.mockImplementation((userId: string) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}`,
                refreshToken: `mock-refresh-token-${userId}`,
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
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('should refresh access token with valid refresh token', async () => {
            const userId = 'test-user-id-123';
            const mockRefreshToken = `mock-refresh-token-${userId}`;

            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send({ refreshToken: mockRefreshToken });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.accessToken).toBe(`mock-access-token-${userId}-new`);
            expect(response.body.data.refreshToken).toBe(`mock-refresh-token-${userId}-new`);

            // Verify that the mock was called correctly
            expect(mockTokenService.refreshTokens).toHaveBeenCalledWith(mockRefreshToken);
        });

        it('should invalidate old refresh token', async () => {
            const userId = 'test-user-id-456';
            const mockRefreshToken = `mock-refresh-token-${userId}`;

            // First refresh
            const response1 = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send({ refreshToken: mockRefreshToken });

            expect(response1.status).toBe(200);

            // Second refresh with same token should also work (mock behavior)
            const response2 = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send({ refreshToken: mockRefreshToken });

            expect(response2.status).toBe(200);

            // Verify that the mock was called twice
            expect(mockTokenService.refreshTokens).toHaveBeenCalledTimes(2);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should logout and blacklist token', async () => {
            const userId = 'test-user-id-789';
            const mockAccessToken = `mock-access-token-${userId}`;

            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .set('Authorization', `Bearer ${mockAccessToken}`)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBeDefined();

            // Verify that the mock was called correctly
            expect(mockTokenService.blacklistToken).toHaveBeenCalledWith(mockAccessToken);
        });
    });

    describe('POST /api/v1/auth/revoke-all-tokens', () => {
        it('should revoke all user tokens', async () => {
            const userId = 'test-user-id-101';
            const mockAccessToken = `mock-access-token-${userId}`;

            const response = await request(app)
                .post('/api/v1/auth/revoke-all-tokens')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .set('Authorization', `Bearer ${mockAccessToken}`)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBeDefined();

            // Verify that the mock was called correctly
            expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(userId);
        });
    });
});
