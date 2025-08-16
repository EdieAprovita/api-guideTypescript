// IMPORTANT: Set environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

import request from 'supertest';
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { integrationLog, setupLog } from '../utils/testLogger';

setupLog('Loading user integration test file...');

// Clear all mocks to ensure clean state
vi.clearAllMocks();
vi.resetAllMocks();

// Use real implementations for integration tests
vi.unmock('../../services/TokenService');
vi.unmock('../../services/UserService');
vi.unmock('../../middleware/authMiddleware');

// Force Vitest to use real implementations by resetting module registry
vi.resetModules();

import app from '../../app';
import { setupTestCleanup } from './helpers/testCleanup';
import { createAdminUser, generateAuthTokens } from './helpers/testFixtures';
import { connect, closeDatabase } from './helpers/testDb';

// Setup automatic database cleanup after each test
setupTestCleanup();

// Aumentar el timeout global para todos los tests de integración
vi.setConfig({ testTimeout: 45000 });

describe('User API Integration Tests', () => {
    beforeAll(async () => {
        // Connect to test database
        await connect();
    });

    afterAll(async () => {
        // Close database connection
        await closeDatabase();
    });

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    it('should get current user profile', async () => {
        // Create a real admin user
        const adminUser = await createAdminUser();
        const tokens = await generateAuthTokens(adminUser._id.toString(), adminUser.email, 'admin');

        const response = await request(app)
            .get('/api/v1/users/profile')
            .set('Authorization', `Bearer ${tokens.accessToken}`)
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1');

        expect(response.status).toBe(200);
        expect(response.body._id || response.body.data._id).toBe(adminUser._id.toString());
    });

    it('should update user profile', async () => {
        // Create a real user
        const user = await createAdminUser();
        const tokens = await generateAuthTokens(user._id.toString(), user.email, 'user');

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
        integrationLog('Starting admin test...');

        // Create a real admin user
        const adminUser = await createAdminUser();
        const tokens = await generateAuthTokens(adminUser._id.toString(), adminUser.email, 'admin');

        integrationLog('Admin user created:', adminUser._id);
        integrationLog('Admin tokens generated:', tokens);

        const response = await request(app)
            .get(`/api/v1/users/${adminUser._id}`)
            .set('Authorization', `Bearer ${tokens.accessToken}`)
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1');

        integrationLog('Admin test response status:', response.status);
        integrationLog('Admin test response body:', response.body);

        expect(response.status).toBe(200);
        expect(response.body._id || response.body.data._id).toBe(adminUser._id.toString());
    });
});
