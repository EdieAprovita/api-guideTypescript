import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import app from '../../app';

// Interfaces for type safety
interface ApiResponse {
    status: number;
    body: {
        message?: string;
        error?: string;
        success?: boolean;
        data?: unknown;
    };
}

interface UserData {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
}

// Helper functions
const expectUnauthorizedResponse = (response: ApiResponse) => {
    expect(response.status).toBe(401);
    expect(response.body.message || response.body.error).toBeDefined();
};

const expectBadRequestResponse = (response: ApiResponse) => {
    expect(response.status).toBe(400);
    expect(response.body.message || response.body.error).toBeDefined();
};

const expectSuccessResponse = (response: ApiResponse, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
};

const createUserData = (overrides: UserData = {}): UserData => ({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: 'TestPassword123!',
    role: 'user',
    ...overrides,
});

const makeRequest = (method: 'get' | 'post', path: string, data?: unknown) => {
    const req = request(app)[method](path)
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1');

    if (data) {
        req.send(data);
    }

    return req;
};

describe('Auth Integration Tests - Simplified', () => {
    describe('Basic API Endpoints', () => {
        it('should respond to health check', async () => {
            const response = await makeRequest('get', '/health');
            expectSuccessResponse(response, 200);
        });

        it('should respond to API info endpoint', async () => {
            const response = await makeRequest('get', '/api/v1');
            expectSuccessResponse(response, 200);
        });
    });

    describe('User Registration - Basic Validation', () => {
        it('should reject registration with invalid email format', async () => {
            const userData = createUserData({ email: 'invalid-email' });
            const response = await makeRequest('post', '/api/v1/users/register', userData);
            expectBadRequestResponse(response);
        });

        it('should reject registration with weak password', async () => {
            const userData = createUserData({ password: '123' });
            const response = await makeRequest('post', '/api/v1/users/register', userData);
            expectBadRequestResponse(response);
        });

        it('should reject registration with missing required fields', async () => {
            const userData = { email: 'test@example.com' }; // Missing username and password
            const response = await makeRequest('post', '/api/v1/users/register', userData);
            expectBadRequestResponse(response);
        });
    });

    describe('User Login - Basic Validation', () => {
        it('should reject login with missing credentials', async () => {
            const response = await makeRequest('post', '/api/v1/users/login', {});
            expectBadRequestResponse(response);
        });

        it('should reject login with invalid email format', async () => {
            const response = await makeRequest('post', '/api/v1/users/login', {
                email: 'invalid-email',
                password: 'password123'
            });
            expectBadRequestResponse(response);
        });
    });

    describe('Protected Routes - Basic Access Control', () => {
        it('should reject access to protected route without token', async () => {
            const response = await makeRequest('get', '/api/v1/users/profile');
            expectUnauthorizedResponse(response);
        });

        it('should reject access to protected route with invalid token format', async () => {
            const response = await makeRequest('get', '/api/v1/users/profile')
                .set('Authorization', 'Bearer invalid-token');
            expectUnauthorizedResponse(response);
        });

        it('should reject access to admin route without proper authentication', async () => {
            const response = await makeRequest('get', '/api/v1/users')
                .set('Authorization', 'Bearer mock-token');
            expectUnauthorizedResponse(response);
        });
    });

    describe('API Structure Validation', () => {
        it('should have proper error response structure', async () => {
            const response = await makeRequest('get', '/api/v1/users/profile');
            
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
        });

        it('should have proper validation error structure', async () => {
            const response = await makeRequest('post', '/api/v1/users/register', {
                email: 'invalid-email'
            });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
        });
    });

    describe('Rate Limiting and Security', () => {
        it('should include security headers', async () => {
            const response = await makeRequest('get', '/');
            
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-frame-options');
        });

        it('should handle malformed requests gracefully', async () => {
            const response = await makeRequest('post', '/api/v1/users/register', 'invalid-json');
            expect(response.status).toBe(400);
        });
    });
});
