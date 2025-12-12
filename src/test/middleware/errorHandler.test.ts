import { vi, describe, it, beforeEach, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';
import logger from '../../utils/logger.js';
import testConfig from '../testConfig.js';
import { expectErrorResponse, expectValidationErrorResponse, expectServerError } from '../utils/responseExpectations.js';

// Mock logger
vi.mock('../../utils/logger', () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    },
}));

// Error route creation helper
const createErrorRoute = (app: express.Application, path: string, errorCreator: () => unknown) => {
    app.get(path, (_req, _res, next) => {
        next(errorCreator());
    });
};

// Test data for various error types
const errorScenarios = [
    {
        path: '/http-error',
        creator: () => new HttpError(HttpStatusCode.BAD_REQUEST, 'Bad request error'),
        expectedStatus: 400,
        expectedMessage: 'Bad request error',
        expectedError: 'Bad request error',
    },
    {
        path: '/http-error-unauthorized',
        creator: () => new HttpError(HttpStatusCode.UNAUTHORIZED, 'Unauthorized access'),
        expectedStatus: 401,
        expectedMessage: 'Unauthorized access',
        expectedError: 'Unauthorized access',
    },
    {
        path: '/generic-error',
        creator: () => new Error('Something went wrong'),
        expectedStatus: 500,
        expectedMessage: 'Something went wrong',
        expectedError: 'Something went wrong',
    },
    {
        path: '/string-error',
        creator: () => 'String error message',
        expectedStatus: 500,
        expectedMessage: 'String error message',
        expectedError: 'An error occurred',
    },
    {
        path: '/unknown-error',
        creator: () => ({ weird: 'object' }),
        expectedStatus: 500,
        expectedMessage: 'An unknown error occurred',
        expectedError: 'Unknown error',
    },
];

const jsErrorScenarios = [
    {
        path: '/syntax-error',
        creator: () => new SyntaxError('Unexpected token'),
        expectedStatus: 400,
        expectedMessage: 'Syntax Error: Unexpected token',
        expectedError: 'Invalid request syntax',
    },
    {
        path: '/type-error',
        creator: () => new TypeError('Cannot read property of undefined'),
        expectedStatus: 500,
        expectedMessage: 'Type Error: Cannot read property of undefined',
        expectedError: 'Internal type error',
    },
    {
        path: '/range-error',
        creator: () => new RangeError('Invalid array length'),
        expectedStatus: 400,
        expectedMessage: 'Range Error: Invalid array length',
        expectedError: 'Value out of range',
    },
];

const app = express();
app.use(express.json());

// Setup error routes
[...errorScenarios, ...jsErrorScenarios].forEach(({ path, creator }) => {
    createErrorRoute(app, path, creator);
});

// Specialized error routes
app.get('/validation-error', (_req, _res, next) => {
    const error = new Error('Validation failed') as Error & {
        name: string;
        errors: Array<{ field: string; message: string }>;
    };
    error.name = 'ValidationError';
    error.errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: testConfig.messages.validation.AUTH_LENGTH },
    ];
    next(error);
});

app.get('/cast-error', (_req, _res, next) => {
    const error = new Error('Cast to ObjectId failed') as Error & {
        name: string;
        value: string;
    };
    error.name = 'CastError';
    error.value = 'invalid-id';
    next(error);
});

app.get('/duplicate-key-error', (_req, _res, next) => {
    const error = new Error('Duplicate key error') as Error & {
        code: number;
        keyPattern: Record<string, number>;
        keyValue: Record<string, string>;
    };
    error.code = 11000;
    error.keyPattern = { email: 1 };
    error.keyValue = { email: faker.internet.email() };
    next(error);
});

// Add error handler middleware
app.use(errorHandler);

describe('Error Handler Middleware Tests', () => {
    const mockedLogger = logger as vi.Mocked<typeof logger>;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    describe('Standard Error Scenarios', () => {
        errorScenarios.forEach(({ path, expectedStatus, expectedMessage, expectedError }) => {
            it(`should handle ${path.replace('/', '')} correctly`, async () => {
                const response = await request(app).get(path);
                expectErrorResponse(response, expectedStatus, expectedMessage, expectedError);
            });
        });
    });

    describe('JavaScript Built-in Errors', () => {
        jsErrorScenarios.forEach(({ path, expectedStatus, expectedMessage, expectedError }) => {
            it(`should handle ${path.replace('/', '')} correctly`, async () => {
                const response = await request(app).get(path);
                expectErrorResponse(response, expectedStatus, expectedMessage, expectedError);
            });
        });
    });

    describe('Mongoose-specific Errors', () => {
        it('should handle ValidationError with field details', async () => {
            const response = await request(app).get('/validation-error');
            expectValidationErrorResponse(response, 'Validation Error', 'Invalid input data', [
                { field: 'email', message: testConfig.messages.validation.EMAIL_FORMAT },
                { field: 'password', message: testConfig.messages.validation.AUTH_LENGTH },
            ]);
        });

        it('should handle CastError for invalid ObjectId', async () => {
            const response = await request(app).get('/cast-error');
            expectErrorResponse(response, 400, 'Invalid _id: invalid-id', 'Invalid data format');
        });

        it('should handle duplicate key errors', async () => {
            const response = await request(app).get('/duplicate-key-error');
            expectErrorResponse(response, 400, 'Duplicate field value: email', 'Duplicate field value entered');
        });
    });

    describe('Environment-specific behavior', () => {
        const testEnvironmentBehavior = async (env: string, expectedError: string) => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = env;

            const response = await request(app).get('/generic-error');
            expectErrorResponse(response, 500, 'Something went wrong', expectedError);

            process.env.NODE_ENV = originalEnv;
        };

        it('should not expose error details in production', async () => {
            await testEnvironmentBehavior('production', 'Internal server error');
        });

        it('should expose error details in development', async () => {
            await testEnvironmentBehavior('development', 'Something went wrong');
        });
    });

    describe('Error Logging', () => {
        const loggerTestCases = [
            { path: '/http-error', expectedProps: { status: 400, message: 'Bad request error' } },
            { path: '/validation-error', expectedProps: { name: 'ValidationError' } },
        ];

        loggerTestCases.forEach(({ path, expectedProps }) => {
            it(`should log ${path.replace('/', '')} with appropriate details`, async () => {
                await request(app).get(path);
                expect(mockedLogger.error).toHaveBeenCalledWith(
                    'Error Handler:',
                    expect.objectContaining(expectedProps)
                );
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle errors without message', async () => {
            app.get('/no-message-error', (_req, _res, next) => {
                next(new Error());
            });
            // Register error handler after dynamically adding the route to ensure proper middleware order
            app.use(errorHandler);

            const response = await request(app).get('/no-message-error');
            expect(response.status).toBe(500);
            expect(response.body.message).toBeDefined();
        });

        it('should handle null errors gracefully', async () => {
            app.get('/null-error', (_req, _res, next) => {
                next();
            });

            const response = await request(app).get('/null-error');
            expect(response.status).toBe(404); // Express default 404
        });

        it('should prevent response after headers sent', async () => {
            app.get('/headers-sent', (req, res, next) => {
                res.json({ sent: true });
                res.headersSent = true;
                next(new Error('Error after response'));
            });

            const response = await request(app).get('/headers-sent');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ sent: true });
        });
    });
});
