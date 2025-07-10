/**
 * Common test helpers to reduce duplication across test files
 * This file provides shared utilities for validation, mocking, and test assertions
 */

import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';

// HTTP Status constants
import { HTTP_STATUS_CODES } from '../constants/validationMessages';

export const HTTP_STATUS = HTTP_STATUS_CODES;

// Type definitions for test responses
interface TestResponse {
    status: number;
    body: {
        success: boolean;
        message?: string;
        error?: string;
        errors?: Array<{ field: string; message: string }>;
        data?: unknown;
    };
}

interface TestUser {
    _id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
}

interface TestRequest {
    body: Record<string, unknown>;
    params: Record<string, unknown>;
    user: TestUser | null;
    query: Record<string, unknown>;
    headers: Record<string, unknown>;
}

interface MockResponse {
    status: jest.MockedFunction<(code: number) => MockResponse>;
    json: jest.MockedFunction<(data: unknown) => MockResponse>;
    send: jest.MockedFunction<(data: unknown) => MockResponse>;
}

// Common validation functions
export const validateErrorResponse = (
    response: TestResponse,
    expectedStatus: number,
    expectedMessage: string,
    expectedError: string
): void => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual({
        success: false,
        message: expectedMessage,
        error: expectedError,
    });
};

export const validateValidationErrorResponse = (
    response: TestResponse,
    expectedMessage: string,
    expectedError: string,
    expectedErrors: Array<{ field: string; message: string }>
): void => {
    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body).toEqual({
        success: false,
        message: expectedMessage,
        error: expectedError,
        errors: expectedErrors,
    });
};

export const validateSuccessResponse = (
    response: TestResponse,
    expectedStatus: number = HTTP_STATUS.OK,
    expectedMessage?: string
): void => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    if (expectedMessage) {
        expect(response.body.message).toBe(expectedMessage);
    }
};

// Mock request/response helpers
export const createMockRequest = (
    body: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
    user: TestUser | null = null
): TestRequest => ({
    body,
    params,
    user,
    query: {},
    headers: {},
});

export const createMockResponse = (): MockResponse => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
});

export const createMockNext = (): jest.MockedFunction<NextFunction> => jest.fn();

// Test data generators
export const generateTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    role: 'user',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const generateTestBusiness = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    address: faker.location.streetAddress(),
    phoneNumber: faker.phone.number(),
    email: faker.internet.email(),
    category: faker.helpers.arrayElement(['restaurant', 'market', 'sanctuary']),
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const generateTestReview = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    businessId: faker.database.mongodbObjectId(),
    userId: faker.database.mongodbObjectId(),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.lorem.paragraph(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Common test setup
export const setupTestEnvironment = (): void => {
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
};

export const teardownTestEnvironment = (): void => {
    process.env.NODE_ENV = 'development';
};

// Import centralized validation messages to avoid duplication
import { ERROR_MESSAGES } from '../constants/validationMessages';

// Re-export validation messages for backward compatibility
export const VALIDATION_MESSAGES = ERROR_MESSAGES.VALIDATION;

// Common test assertions
export const expectResourceCreated = (response: TestResponse, expectedData: unknown): void => {
    validateSuccessResponse(response, HTTP_STATUS.CREATED, 'Resource created successfully');
    expect(response.body.data).toEqual(expectedData);
};

export const expectResourceUpdated = (response: TestResponse, expectedData: unknown): void => {
    validateSuccessResponse(response, HTTP_STATUS.OK, 'Resource updated successfully');
    expect(response.body.data).toEqual(expectedData);
};

export const expectResourceDeleted = (response: TestResponse): void => {
    validateSuccessResponse(response, HTTP_STATUS.OK, 'Resource deleted successfully');
};

export const expectResourceNotFound = (response: TestResponse): void => {
    validateErrorResponse(response, HTTP_STATUS.NOT_FOUND, 'Resource not found', 'Resource not found');
};

export const expectValidationError = (response: TestResponse, field: string, message: string): void => {
    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toContainEqual({ field, message });
};

// Common mock setups
export const setupCommonMocks = (): void => {
    // Mock database connection
    jest.mock('../../config/db', () => ({
        __esModule: true,
        default: jest.fn(),
    }));

    // Mock logger
    jest.mock('../../utils/logger', () => ({
        __esModule: true,
        default: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        },
    }));

    // Mock GeoService
    jest.mock('../../services/GeoService', () => ({
        __esModule: true,
        default: {
            geocodeAddress: jest.fn().mockResolvedValue({
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
            }),
        },
    }));

    // Mock ReviewService
    jest.mock('../../services/ReviewService', () => ({
        __esModule: true,
        default: {
            addReview: jest.fn().mockResolvedValue(generateTestReview()),
            getTopRatedReviews: jest.fn().mockResolvedValue([]),
        },
    }));

    // Mock auth middleware with proper types
    jest.mock('../../middleware/authMiddleware', () => ({
        protect: jest.fn((req: TestRequest, _res: MockResponse, next: NextFunction) => {
            req.user = generateTestUser();
            next();
        }),
        admin: jest.fn((_req: TestRequest, _res: MockResponse, next: NextFunction) => next()),
        professional: jest.fn((_req: TestRequest, _res: MockResponse, next: NextFunction) => next()),
    }));
};

export const resetMocks = (): void => {
    jest.clearAllMocks();
};
