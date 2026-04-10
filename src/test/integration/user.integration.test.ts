/**
 * User API Integration Tests
 * Simplified tests with proper TypeScript types and no database dependencies
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Response } from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../../models/User.js';
import app from '../../app.js';

interface UserTestData {
    readonly username: string;
    readonly email: string;
    readonly password: string;
}

const createUserData = (overrides: Partial<UserTestData> = {}): UserTestData => {
    const timestamp = Date.now();
    return {
        username: `testuser_${timestamp}`,
        email: `test_${timestamp}@example.com`,
        password: 'TestPassword123!',
        ...overrides,
    };
};

/**
 * Generates a JWT signed with the same issuer/audience as the real TokenService.
 * The userId must belong to a real document in the in-memory DB so that
 * protect() can resolve the user and pass auth before Joi validation runs.
 */
const generateTokenForUser = (userId: string, role: 'user' | 'admin' | 'professional' = 'user'): string => {
    return jwt.sign(
        { userId, email: 'test@example.com', role },
        process.env.JWT_SECRET || 'test-jwt-secret-key-12345',
        {
            expiresIn: '1h',
            issuer: 'vegan-guide-api',
            audience: 'vegan-guide-client',
        }
    );
};

// Unused VALID_RESPONSE_CODES array removed for exact assertions.

describe('User API Integration Tests', () => {
    describe('POST /api/v1/users/register', () => {
        it('should handle user registration request', async () => {
            const userData = createUserData();

            const response: Response = await request(app).post('/api/v1/users/register').send(userData);

            expect(response.status).toBe(201);
            expect(typeof response.status).toBe('number');
        });

        it('should handle invalid email format', async () => {
            const userData = createUserData({ email: 'invalid-email' });

            const response: Response = await request(app).post('/api/v1/users/register').send(userData);

            if (response.status !== 400) {
                console.log('INVALID EMAIL REGISTRATION BODY:', JSON.stringify(response.body, null, 2));
            }

            expect(response.status).toBe(400);
        });

        it('should handle weak password', async () => {
            const userData = createUserData({ password: '123' });

            const response: Response = await request(app).post('/api/v1/users/register').send(userData);

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/v1/users/login', () => {
        it('should handle login request', async () => {
            const response: Response = await request(app).post('/api/v1/users/login').send({
                email: 'test@example.com',
                password: 'TestPassword123!',
            });

            expect(response.status).toBe(401);
        });

        it('should handle invalid credentials', async () => {
            const response: Response = await request(app).post('/api/v1/users/login').send({
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            });

            expect(response.status).toBe(401);
        });
    });

    describe('Protected Endpoints', () => {
        /**
         * The global beforeEach in integration-setup.ts clears all collections
         * before each test. We use a fixed ObjectId so the JWT can be signed once
         * at module load time and remains valid across all tests in this block.
         * The user document is re-created before each test that needs it.
         */
        const ADMIN_ID = new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');
        const adminToken = generateTokenForUser(ADMIN_ID.toString(), 'admin');

        beforeEach(async () => {
            // Re-seed the admin user after the global collection clear.
            // Use .save() so that pre('save') middleware runs and the password gets bcrypt-hashed.
            const existingAdmin = await User.findById(ADMIN_ID);
            if (!existingAdmin) {
                const admin = new User({
                    _id: ADMIN_ID,
                    username: 'testadmin',
                    email: 'admin@test.com',
                    password: 'AdminPass123!',
                    role: 'admin',
                });
                await admin.save();
            }
        });

        it('should handle GET /api/v1/users without auth', async () => {
            const response: Response = await request(app).get('/api/v1/users');

            expect(response.status).toBe(401);
        });

        it('should handle GET /api/v1/users/profile without auth', async () => {
            const response: Response = await request(app).get('/api/v1/users/profile');

            expect(response.status).toBe(401);
        });

        it('should handle PUT /api/v1/users/profile without auth', async () => {
            const response: Response = await request(app).put('/api/v1/users/profile').send({ username: 'updated' });

            expect(response.status).toBe(401);
        });

        it('should handle PATCH /api/v1/users/profile/:id/role without auth', async () => {
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/507f1f77bcf86cd799439011/role')
                .send({ role: 'admin' });

            expect(response.status).toBe(401);
        });

        it('should handle PATCH /api/v1/users/profile/:id/role invalid role validation', async () => {
            // 'notanid' fails paramSchemas.id (not a valid ObjectId) — Joi rejects with 400.
            // adminToken references a real DB user so protect() passes first.
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/notanid/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'invalid_role' });

            expect(response.status).toBe(400);
        });

        it('should handle PATCH /api/v1/users/profile/:id/role when role is missing', async () => {
            // Body missing required `role` field — Joi rejects with 400.
            // adminToken references a real DB user so protect() passes first.
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/507f1f77bcf86cd799439011/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it('should handle PATCH /api/v1/users/profile/:id/role with valid admin token', async () => {
            // adminToken references a real DB user so protect() + admin() pass.
            // Target user 507f1f77bcf86cd799439011 does not exist → controller returns 404.
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/507f1f77bcf86cd799439011/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'professional' });

            // Auth and Joi validation pass; controller finds no target user → 404.
            expect([200, 404]).toContain(response.status);
        });

        it('should reject PATCH /api/v1/users/profile/:id/role with invalid role', async () => {
            // 'business' is not in the Joi enum ('user' | 'professional' | 'admin') — Joi rejects with 400.
            // adminToken references a real DB user so protect() passes first.
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/507f1f77bcf86cd799439011/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'business' });

            expect(response.status).toBe(400);
        });

        it('should handle DELETE /api/v1/users/:id without auth', async () => {
            const response: Response = await request(app).delete('/api/v1/users/507f1f77bcf86cd799439011');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/v1/users — pagination', () => {
        const ADMIN_ID = new Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb');
        const adminToken = generateTokenForUser(ADMIN_ID.toString(), 'admin');

        beforeEach(async () => {
            // Seed admin user
            const existingAdmin = await User.findById(ADMIN_ID);
            if (!existingAdmin) {
                const admin = new User({
                    _id: ADMIN_ID,
                    username: 'paginationadmin',
                    email: 'paginationadmin@test.com',
                    password: 'AdminPass123!',
                    role: 'admin',
                });
                await admin.save();
            }

            // Seed 12 regular users so we can test pagination
            for (let i = 1; i <= 12; i++) {
                const ts = `${i}`.padStart(3, '0');
                const uid = new Types.ObjectId();
                const u = new User({
                    _id: uid,
                    username: `bulkuser_${ts}`,
                    email: `bulkuser_${ts}@example.com`,
                    password: 'BulkPass123!',
                    role: 'user',
                });
                await u.save();
            }
        });

        it('returns 200 with pagination metadata using default params', async () => {
            const response: Response = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toMatchObject({
                currentPage: 1,
                itemsPerPage: 20,
            });
        });

        it('returns 200 with correct page/limit when explicitly requested', async () => {
            const response: Response = await request(app)
                .get('/api/v1/users?page=2&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.pagination).toMatchObject({
                currentPage: 2,
                itemsPerPage: 5,
            });
            // 13 total (12 bulk + 1 admin), page 2 of 5-per-page = items 6-10
            expect(response.body.data.length).toBeLessThanOrEqual(5);
        });

        it('returns 400 when limit exceeds max (500 > 100)', async () => {
            const response: Response = await request(app)
                .get('/api/v1/users?limit=500')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
        });

        it('returns 400 when limit is 0 (below min)', async () => {
            const response: Response = await request(app)
                .get('/api/v1/users?limit=0')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
        });

        it('uses defaults when no params are supplied (page=1, limit=20)', async () => {
            const response: Response = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.pagination.currentPage).toBe(1);
            expect(response.body.pagination.itemsPerPage).toBe(20);
        });
    });

    describe('DELETE /api/v1/users/:id — 404 for missing user', () => {
        const ADMIN_ID = new Types.ObjectId('cccccccccccccccccccccccc');
        const adminToken = generateTokenForUser(ADMIN_ID.toString(), 'admin');

        beforeEach(async () => {
            const existingAdmin = await User.findById(ADMIN_ID);
            if (!existingAdmin) {
                const admin = new User({
                    _id: ADMIN_ID,
                    username: 'deleteadmin',
                    email: 'deleteadmin@test.com',
                    password: 'AdminPass123!',
                    role: 'admin',
                });
                await admin.save();
            }
        });

        it('returns 404 when deleting a non-existent user', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const response: Response = await request(app)
                .delete(`/api/v1/users/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });

        it('returns 200 when deleting an existing user', async () => {
            const targetUser = new User({
                username: 'tobedeleted',
                email: 'tobedeleted@example.com',
                password: 'ToDelete123!',
                role: 'user',
            });
            await targetUser.save();
            const targetId = (targetUser._id as Types.ObjectId).toString();

            const response: Response = await request(app)
                .delete(`/api/v1/users/${targetId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            // responseWrapper wraps non-success-keyed objects: { success: true, data: { message: ... } }
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('message', 'User deleted successfully');
        });

        it('returns 404 on second delete of the same id', async () => {
            const targetUser = new User({
                username: 'deletedtwice',
                email: 'deletedtwice@example.com',
                password: 'ToDelete123!',
                role: 'user',
            });
            await targetUser.save();
            const targetId = (targetUser._id as Types.ObjectId).toString();

            // First delete — should succeed
            const first: Response = await request(app)
                .delete(`/api/v1/users/${targetId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(first.status).toBe(200);

            // Second delete — user is gone, must be 404
            const second: Response = await request(app)
                .delete(`/api/v1/users/${targetId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(second.status).toBe(404);
        });
    });
});
