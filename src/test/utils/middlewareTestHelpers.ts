import { vi, type MockedFunction } from 'vitest';
/**
 * Centralized middleware test helpers to eliminate duplication
 * This file consolidates common patterns used across middleware tests
 */

import { Request, Response, NextFunction } from 'express';
import express from 'express';
import request from 'supertest';
import {
    expectErrorResponse,
    expectSuccessResponse,
    expectValidationErrorResponse,
    expectSecurityHeaders,
} from './responseExpectations';
import { generateMaliciousData, generateValidData } from './mockGenerators';

// Common Express app setup patterns
export const createTestApp = () => {
    const app = express();
    app.use(express.json());
    return app;
};

// Route creation helper to reduce duplication
const createRouteWithError = (
    app: express.Application,
    path: string,
    errorCreator: () => Error,
    method: 'get' | 'post' = 'get'
) => {
    const handler = (_req: Request, _res: Response, next: NextFunction) => {
        next(errorCreator());
    };

    if (method === 'get') {
        app.get(path, handler);
    } else {
        app.post(path, handler);
    }
};

// Error scenarios configuration
const errorScenarios = [
    {
        path: '/generic-error',
        creator: () => new Error('Something went wrong'),
    },
    {
        path: '/http-error',
        creator: () => {
            const error = new Error('Bad request error') as Error & { statusCode: number };
            error.statusCode = 400;
            return error;
        },
    },
    {
        path: '/http-error-unauthorized',
        creator: () => {
            const error = new Error('Unauthorized access') as Error & { statusCode: number };
            error.statusCode = 401;
            return error;
        },
    },
    {
        path: '/cast-error',
        creator: () => {
            const error = new Error('Cast to ObjectId failed') as Error & {
                name: string;
                path: string;
                value: string;
            };
            error.name = 'CastError';
            error.path = '_id';
            error.value = 'invalid-id';
            return error;
        },
    },
    {
        path: '/syntax-error',
        creator: () => {
            const error = new Error('Syntax Error: Unexpected token') as Error & { name: string };
            error.name = 'SyntaxError';
            return error;
        },
    },
    {
        path: '/type-error',
        creator: () => {
            const error = new Error('Type Error: Cannot read property of undefined') as Error & { name: string };
            error.name = 'TypeError';
            return error;
        },
    },
    {
        path: '/range-error',
        creator: () => {
            const error = new Error('Range Error: Invalid array length') as Error & { name: string };
            error.name = 'RangeError';
            return error;
        },
    },
];

// Common middleware test route builders
export const createErrorRoutes = (app: express.Application) => {
    errorScenarios.forEach(({ path, creator }) => {
        createRouteWithError(app, path, creator);
    });
    return app;
};

// Generic route creator for middleware testing
const createMiddlewareTestRoute = (
    app: express.Application,
    path: string,
    method: 'get' | 'post',
    middleware: express.RequestHandler,
    responseData?: unknown
) => {
    const handler = (req: Request, res: Response) => {
        res.json({
            success: true,
            data: responseData || req.body || req.params,
        });
    };

    if (method === 'get') {
        app.get(path, middleware, handler);
    } else {
        app.post(path, middleware, handler);
    }
};

export const createValidationRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    createMiddlewareTestRoute(app, '/test-user-validation', 'post', middleware);
    createMiddlewareTestRoute(app, '/test-param-validation/:id', 'get', middleware);
    return app;
};

export const createSecurityRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    createMiddlewareTestRoute(app, '/test-security', 'get', middleware);
    createMiddlewareTestRoute(app, '/test-suspicious', 'post', middleware);
    return app;
};

export const createSanitizationRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    createMiddlewareTestRoute(app, '/test-sanitization', 'post', middleware);
    return app;
};

export const createCacheRoutes = (app: express.Application, middleware: express.RequestHandler) => {
    createMiddlewareTestRoute(app, '/cached-route/:id', 'get', middleware, {
        timestamp: new Date().toISOString(),
    });

    // Cache invalidation route (no middleware)
    app.post('/invalidate/:id', (req, res) => {
        res.json({
            success: true,
            message: 'Cache invalidated',
        });
    });

    return app;
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
        vi.clearAllMocks();
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

// Re-export utilities for backward compatibility
export {
    expectErrorResponse,
    expectSuccessResponse,
    expectValidationErrorResponse,
    expectSecurityHeaders,
    generateMaliciousData,
    generateValidData,
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
