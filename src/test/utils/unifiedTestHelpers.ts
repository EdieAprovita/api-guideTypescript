import { vi, type MockedFunction, type Mock } from 'vitest';
/**
 * Unified Test Helpers - Eliminates duplication across test files
 * Single source of truth for all test utilities and helpers
 */
import request from 'supertest';
import { Application } from 'express';
import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import { Response as SupertestResponse } from 'supertest';
import jwt from 'jsonwebtoken';

// ===== TYPE DEFINITIONS =====
export interface TestUser {
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

interface MockResponse {
    status: MockedFunction<(code: number) => MockResponse>;
    json: MockedFunction<(data: unknown) => MockResponse>;
    send: MockedFunction<(data: unknown) => MockResponse>;
}

// ===== CONSTANTS =====
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

// ===== SUPERTEST RESPONSE HELPERS =====
export const expectSuccessResponse = (response: SupertestResponse, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
};

export const expectErrorResponse = (response: SupertestResponse, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBeDefined();
    expect(typeof response.body.message).toBe('string');
};

export const expectValidationError = (response: SupertestResponse) => {
    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('validation');
};

export const expectUnauthorizedError = (response: SupertestResponse) => {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Unauthorized');
};

export const expectForbiddenError = (response: SupertestResponse) => {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Forbidden');
};

export const expectNotFoundError = (response: SupertestResponse) => {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not found');
};

export const expectPaginatedResponse = (response: SupertestResponse) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(typeof response.body.pagination.total).toBe('number');
};

export const expectResourceCreated = (response: SupertestResponse) => {
    expect(response.status).toBe(201);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBeDefined();
};

export const expectResourceUpdated = (response: SupertestResponse) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBeDefined();
};

export const expectResourceDeleted = (response: SupertestResponse) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted');
};

// ===== TRADITIONAL TEST RESPONSE VALIDATORS =====
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

// ===== MOCK HELPERS =====
export const createMockRequest = (
    body: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
    user: TestUser | null = null
) => ({
    body,
    params,
    user,
    query: {},
    headers: {},
});

export const createMockResponse = (): MockResponse => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
});

export const createMockNext = (): MockedFunction<NextFunction> => vi.fn();

export const createServiceMocks = (serviceName: string) => ({
    getAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Mock ${serviceName}` }),
    create: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `New ${serviceName}` }),
    updateById: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Updated ${serviceName}` }),
    deleteById: vi.fn().mockResolvedValue('Deleted successfully'),
});

// ===== DATA GENERATORS =====
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    role: 'user',
    email: faker.internet.email(),
    username: faker.internet.userName(),
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createAdminUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    role: 'admin',
    email: faker.internet.email(),
    username: faker.internet.userName(),
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createProfessionalUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    role: 'professional',
    email: faker.internet.email(),
    username: faker.internet.userName(),
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// ===== AUTHENTICATION HELPERS =====
export const createAuthenticatedRequest = (app: Application, user: TestUser = createTestUser()) => {
    return request(app);
};

export const generateMockToken = (type: 'access' | 'refresh' = 'access', userId: string = 'user123'): string => {
    const payload = {
        user: { id: userId, role: 'user' },
        type,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (type === 'access' ? 3600 : 86400),
    };
    
    return jwt.sign(payload, 'test_secret');
};

export const generateExpiredToken = (): string => {
    const payload = {
        user: { id: 'user123', role: 'user' },
        type: 'access',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
    };
    
    return jwt.sign(payload, 'test_secret');
};

// ===== UTILITY FUNCTIONS =====
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectMockToHaveBeenCalledWith = <T extends unknown[]>(
    mockFn: MockedFunction<(...args: T) => unknown>,
    ...expectedArgs: T
) => {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
};

export const expectMockToHaveBeenCalledTimes = (mockFn: Mock, times: number) => {
    expect(mockFn).toHaveBeenCalledTimes(times);
};

export const setupTestEnvironment = (envVars: Record<string, string> = {}) => {
    process.env.NODE_ENV = 'test';
    Object.entries(envVars).forEach(([key, value]) => {
        process.env[key] = value;
    });
    vi.clearAllMocks();
};

export const teardownTestEnvironment = () => {
    process.env.NODE_ENV = 'development';
};

export const resetMocks = () => {
    vi.clearAllMocks();
    vi.resetAllMocks();
};

// ===== MOCK DATA FACTORY =====
export const createMockData = {
    user: (overrides = {}) => ({
        _id: faker.database.mongodbObjectId(),
        email: faker.internet.email(),
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        isDeleted: false,
        ...overrides,
    }),

    restaurant: (overrides = {}) => ({
        _id: faker.database.mongodbObjectId(),
        name: 'Test Restaurant',
        description: 'Test Restaurant Description',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        contact: [],
        cuisine: 'Test Cuisine',
        reviews: [],
        rating: 4.5,
        isVerified: true,
        ...overrides,
    }),

    review: (overrides = {}) => ({
        _id: faker.database.mongodbObjectId(),
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentence(),
        businessId: faker.database.mongodbObjectId(),
        userId: faker.database.mongodbObjectId(),
        ...overrides,
    }),
};

// Re-export specific functions for backward compatibility
export { createMockData as createMockUser };
export { createMockData as createMockRestaurant };
export { createMockData as createMockReview };