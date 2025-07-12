import request from 'supertest';
import app from '../../app';
import { faker } from '@faker-js/faker';
import {
    connect as connectTestDB,
    closeDatabase as disconnectTestDB,
    clearDatabase as clearTestDB,
} from './helpers/testDb';
import {
    createTestUser,
    createAdminUser,
    generateAuthTokens,
} from './helpers/testFixtures';
import { User } from '../../models/User';

// Basic integration tests for user endpoints (skipped pending environment setup)

describe.skip('User API Integration Tests', () => {
    let userId: string;
    let userToken: string;
    let adminToken: string;

    beforeAll(async () => {
        await connectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        const user = await createTestUser();
        userId = user._id.toString();
        const tokens = await generateAuthTokens(userId, user.email, user.role);
        userToken = tokens.accessToken;

        const admin = await createAdminUser();
        const adminTokens = await generateAuthTokens(
            admin._id.toString(),
            admin.email,
            admin.role
        );
        adminToken = adminTokens.accessToken;
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it('should get current user profile', async () => {
        const response = await request(app)
            .get('/api/v1/users/profile')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body._id || response.body.data._id).toBe(userId);
    });

    it('should update user profile', async () => {
        const response = await request(app)
            .put(`/api/v1/users/profile/${userId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ username: 'updated-name' });

        expect(response.status).toBe(200);
        expect(response.body.username || response.body.data.username).toBe(
            'updated-name'
        );

        const updated = await User.findById(userId);
        expect(updated?.username).toBe('updated-name');
    });

    it('should get user by id as admin', async () => {
        const response = await request(app)
            .get(`/api/v1/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body._id || response.body.data._id).toBe(userId);
    });
});
