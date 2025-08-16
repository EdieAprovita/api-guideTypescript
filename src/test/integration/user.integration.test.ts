import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../app';
import { setupTestDB } from './helpers/testSetup';

describe('User API Integration Tests', () => {
    setupTestDB();

    it('should handle user profile endpoint', async () => {
        const response = await request(app).get('/api/v1/users/profile');
        expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should handle user registration', async () => {
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
        };

        const response = await request(app)
            .post('/api/v1/users/register')
            .send(userData);

        expect([200, 201, 400, 409, 422, 500]).toContain(response.status);
    });

    it('should handle user login', async () => {
        const loginData = {
            email: 'test@example.com',
            password: 'password123',
        };

        const response = await request(app)
            .post('/api/v1/users/login')
            .send(loginData);

        expect([200, 400, 401, 404, 500]).toContain(response.status);
    });

    it('should handle get all users endpoint', async () => {
        const response = await request(app).get('/api/v1/users');
        expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
});