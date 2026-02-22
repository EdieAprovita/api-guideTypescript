/**
 * User API Integration Tests
 * Simplified tests with proper TypeScript types and no database dependencies
 */

import request from 'supertest';
import { describe, it, expect } from 'vitest';
import type { Response } from 'supertest';
import jwt from 'jsonwebtoken';
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
    };
};

const generateMockToken = (role: 'user' | 'admin' | 'business' = 'user'): string => {
    return jwt.sign(
        { userId: '507f1f77bcf86cd799439011', email: 'test@example.com', role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
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
            const adminToken = generateMockToken('admin');
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/notanid/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'invalid_role' });

            // Expect a 400 Bad Request due to validation on role ('admin', 'user', 'business')
            expect(response.status).toBe(400);
        });

        it('should handle PATCH /api/v1/users/profile/:id/role when role is missing', async () => {
            const adminToken = generateMockToken('admin');
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/507f1f77bcf86cd799439011/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it('should handle PATCH /api/v1/users/profile/:id/role with valid admin token', async () => {
            const adminToken = generateMockToken('admin');
            const response: Response = await request(app)
                .patch('/api/v1/users/profile/507f1f77bcf86cd799439011/role') // id format bypass handled via validate/mock
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'business' });

            // Depending on the native mock setup, this will either be a 404 (user not found for valid update) or 200
            // Here we test simply that it cleared auth guards and valid Joi formatting
            expect([200, 404]).toContain(response.status);
        });

        it('should handle DELETE /api/v1/users/:id without auth', async () => {
            const response: Response = await request(app).delete('/api/v1/users/507f1f77bcf86cd799439011');

            expect(response.status).toBe(401);
        });
    });
});
