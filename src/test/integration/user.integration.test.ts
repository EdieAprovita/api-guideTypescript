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

import request from 'supertest';

// Clear all mocks to ensure clean state
jest.clearAllMocks();
jest.resetAllMocks();

// CRITICAL: Use the mock setup for this test
jest.mock('../../services/TokenService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.tokenService;
});

jest.mock('../../services/UserService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.userService;
});

// Force Jest to use real implementations by resetting module registry
jest.resetModules();

import app from '../../app';
import { serviceMocks } from '../__mocks__/services';
import { generateAuthTokens } from './helpers/testFixtures';

// Aumentar el timeout global para todos los tests de integración
jest.setTimeout(45000);

describe('User API Integration Tests', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should get current user profile', async () => {
        const userId = 'test-user-id-123';
        const tokens = await generateAuthTokens(userId, 'test@example.com', 'user');

        // Setup mock to return user data
        serviceMocks.userService.findUserById.mockResolvedValue({
            _id: userId,
            username: 'testuser',
            email: 'test@example.com',
            role: 'user',
        });

        const response = await request(app)
            .get('/api/v1/users/profile')
            .set('Authorization', `Bearer ${tokens.accessToken}`)
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1');

        expect(response.status).toBe(200);
        expect(response.body._id || response.body.data._id).toBe(userId);
    });

    it('should update user profile', async () => {
        const userId = 'test-user-id-456';
        const tokens = await generateAuthTokens(userId, 'test@example.com', 'user');

        // Setup mock to return updated user data
        serviceMocks.userService.updateUserById.mockResolvedValue({
            _id: userId,
            username: 'updated-name',
            email: 'test@example.com',
            role: 'user',
        });

        const response = await request(app)
            .put('/api/v1/users/profile')
            .set('Authorization', `Bearer ${tokens.accessToken}`)
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1')
            .send({ username: 'updated-name' });

        expect(response.status).toBe(200);
        expect(response.body.username || response.body.data.username).toBe('updated-name');
    });

    it('should get user by id as admin', async () => {
        const userId = 'test-user-id-789';
        const tokens = await generateAuthTokens(userId, 'admin@example.com', 'admin');

        // Setup mock to return user data
        serviceMocks.userService.findUserById.mockResolvedValue({
            _id: userId,
            username: 'adminuser',
            email: 'admin@example.com',
            role: 'admin',
        });

        const response = await request(app)
            .get(`/api/v1/users/${userId}`)
            .set('Authorization', `Bearer ${tokens.accessToken}`)
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1');

        expect(response.status).toBe(200);
        expect(response.body._id || response.body.data._id).toBe(userId);
    });
});
