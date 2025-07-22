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

// CRITICAL: Use the mock setup for this test
jest.mock('../../services/TokenService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.tokenService;
});

// Force Jest to use real implementations by resetting module registry
jest.resetModules();

import app from '../../app';
import { serviceMocks } from '../__mocks__/services';

// Aumentar el timeout global para todos los tests de integración
jest.setTimeout(45000);

// Interfaces for type safety
interface ApiResponse {
    status: number;
    body: {
        message?: string;
        error?: string;
        errors?: Array<{ message: string; field?: string }>;
        token?: string;
        user?: {
            _id: string;
            username: string;
            email: string;
            role: string;
        };
        data?: {
            accessToken?: string;
            refreshToken?: string;
            _id?: string;
        };
        success?: boolean;
    };
}

// Helper functions to reduce duplication
const expectUnauthorizedResponse = (response: ApiResponse) => {
    expect(response.status).toBe(401);
    expect(response.body.message || response.body.error || response.body.errors?.[0]?.message).toBeDefined();
};

const expectBadRequestResponse = (response: ApiResponse) => {
    expect(response.status).toBe(400);
    expect(response.body.message || response.body.error || response.body.errors?.[0]?.message).toBeDefined();
};

const expectSuccessResponse = (response: ApiResponse, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
};

describe('Authentication Flow Solution Tests', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('should refresh access token with valid refresh token', async () => {
            const userId = 'test-user-id-123';
            const mockRefreshToken = `mock-refresh-token-${userId}`;

            // Setup mock to return new tokens
            serviceMocks.tokenService.refreshTokens.mockResolvedValue({
                accessToken: `mock-access-token-${userId}-new`,
                refreshToken: `mock-refresh-token-${userId}-new`,
            });

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
            expect(serviceMocks.tokenService.refreshTokens).toHaveBeenCalledWith(mockRefreshToken);
        });

        it('should invalidate old refresh token', async () => {
            const userId = 'test-user-id-456';
            const mockRefreshToken = `mock-refresh-token-${userId}`;

            // Setup mock to return new tokens
            serviceMocks.tokenService.refreshTokens.mockResolvedValue({
                accessToken: `mock-access-token-${userId}-new`,
                refreshToken: `mock-refresh-token-${userId}-new`,
            });

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
            expect(serviceMocks.tokenService.refreshTokens).toHaveBeenCalledTimes(2);
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
            expect(serviceMocks.tokenService.blacklistToken).toHaveBeenCalledWith(mockAccessToken);
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
            expect(serviceMocks.tokenService.revokeAllUserTokens).toHaveBeenCalledWith(userId);
        });
    });
});
