/**
 * Centralized middleware test helpers to eliminate duplication
 * This file consolidates common patterns used across middleware tests
 */

import { Request, Response, NextFunction } from 'express';
import express from 'express';
import request from 'supertest';
import { faker } from '@faker-js/faker';

// Common Express app setup patterns
export const createTestApp = () => {
    const app = express();
    app.use(express.json());
    return app;
};

// Common response expectation helpers
export const expectErrorResponse = (
    response: request.Response,
    expectedStatus: number,
    expectedMessage: string,
    expectedError: string
) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual({
        success: false,
        message: expectedMessage,
        error: expectedError,
    });
};

export const expectSuccessResponse = (
    response: request.Response,
    expectedStatus: number = 200,
    expectedData?: unknown
) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    if (expectedData) {
        expect(response.body.data).toEqual(expectedData);
    }
};

export const expectValidationErrorResponse = (
    response: request.Response,
    expectedMessage: string,
    expectedError: string,
    expectedErrors: Array<{ field: string; message: string }>
) => {
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
        success: false,
        message: expectedMessage,
        error: expectedError,
        errors: expectedErrors,
    });
};

// Common middleware test route builders
export const createErrorRoutes = (app: express.Application) => {
    // Generic error route
    app.get('/generic-error', (_req, _res, next) => {
        const error = new Error('Something went wrong');
        next(error);
    });

    // HTTP error route
    app.get('/http-error', (_req, _res, next) => {
        const error = new Error('Bad request error') as Error & { statusCode: number };
        error.statusCode = 400;
        next(error);
    });

    // Unauthorized error route
    app.get('/http-error-unauthorized', (_req, _res, next) => {
        const error = new Error('Unauthorized access') as Error & { statusCode: number };
        error.statusCode = 401;
        next(error);
    });

    // Cast error route
    app.get('/cast-error', (_req, _res, next) => {
        const error = new Error('Cast to ObjectId failed') as Error & {
            name: string;
            path: string;
            value: string;
        };
        error.name = 'CastError';
        error.path = '_id';
        error.value = 'invalid-id';
        next(error);
    });

    // Syntax error route
    app.get('/syntax-error', (_req, _res, next) => {
        const error = new Error('Syntax Error: Unexpected token') as Error & { name: string };
        error.name = 'SyntaxError';
        next(error);
    });

    // Type error route
    app.get('/type-error', (_req, _res, next) => {
        const error = new Error('Type Error: Cannot read property of undefined') as Error & { name: string };
        error.name = 'TypeError';
        next(error);
    });

    // Range error route
    app.get('/range-error', (_req, _res, next) => {
        const error = new Error('Range Error: Invalid array length') as Error & { name: string };
        error.name = 'RangeError';
        next(error);
    });

    return app;
};

export const createValidationRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    // Test route for user validation
    app.post('/test-user-validation', middleware, (req, res) => {
        res.json({
            success: true,
            data: req.body,
        });
    });

    // Test route for parameter validation
    app.get('/test-param-validation/:id', middleware, (req, res) => {
        res.json({
            success: true,
            params: req.params,
        });
    });

    return app;
};

export const createSecurityRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    // Test route for security middleware
    app.get('/test-security', middleware, (_req, res) => {
        res.json({ success: true });
    });

    // Test route for suspicious activity detection
    app.post('/test-suspicious', middleware, (req, res) => {
        res.json({
            success: true,
            data: req.body,
        });
    });

    return app;
};

export const createSanitizationRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    // Test route for input sanitization
    app.post('/test-sanitization', middleware, (req, res) => {
        res.json({
            success: true,
            body: req.body,
        });
    });

    return app;
};

export const createCacheRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    // Test route for cache
    app.get('/cached-route/:id', middleware, (req, res) => {
        res.json({
            success: true,
            data: {
                id: req.params.id,
                timestamp: new Date().toISOString(),
            },
        });
    });

    // Test route for cache invalidation
    app.post('/invalidate/:id', (req, res) => {
        res.json({
            success: true,
            message: 'Cache invalidated',
        });
    });

    return app;
};

// Common test data generators
export const generateMaliciousData = () => ({
    script: '<script>alert("xss")</script>',
    javascript: 'javascript%3Aalert("xss")',
    img: '<img src="x" onerror="alert(1)">',
    sql: "'; DROP TABLE users; --",
    union: "1' UNION SELECT * FROM passwords",
    pathTraversal: '../../../etc/passwd',
    pathTraversalWin: '..\\..\\windows\\system32',
    command: 'ls -la; rm -rf /',
    pipe: 'test | cat /etc/passwd',
});

export const generateValidData = () => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    description: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
});

// Common security header expectations
export const expectSecurityHeaders = (response: request.Response) => {
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
};

// Common rate limiting test helper
export const testRateLimit = async (app: express.Application, route: string, limit: number = 100) => {
    const promises = Array(limit + 1)
        .fill(null)
        .map(() => request(app).get(route));

    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
};

// Common mock setup for middleware tests
export const setupMiddlewareTest = () => {
    const app = createTestApp();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    return { app };
};

// Common environment setup
export const setupTestEnvironment = (env: string = 'test') => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = env;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });
};

export default {
    createTestApp,
    expectErrorResponse,
    expectSuccessResponse,
    expectValidationErrorResponse,
    createErrorRoutes,
    createValidationRoutes,
    createSecurityRoutes,
    createSanitizationRoutes,
    createCacheRoutes,
    generateMaliciousData,
    generateValidData,
    expectSecurityHeaders,
    testRateLimit,
    setupMiddlewareTest,
    setupTestEnvironment,
};
