import { vi, type MockedFunction } from 'vitest';
/**
 * Centralized controller test helpers to eliminate duplication
 * This file consolidates common patterns used across controller tests
 */

import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import { Express } from 'express';
import { MockResponse, MockRequest, TestUser } from '../types/mockTypes';
import {
    expectSuccessResponse,
    expectErrorResponse,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted,
    expectResourceNotFound,
    expectUnauthorized,
    expectValidationError,
} from './responseExpectations';
import {
    generateBusinessEntity,
    generateMedicalEntity,
    generateUserEntity,
    generateReviewEntity,
    generateRecipeEntity,
    generateContentEntity,
} from './mockGenerators';

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
    user?: TestUser | null;
}

// Specific mock generators using centralized patterns
export const generateMockUser = (overrides: Partial<TestUser> = {}): TestUser =>
    generateUserEntity(overrides) as TestUser;

export const generateMockBusiness = (overrides: Record<string, unknown> = {}) =>
    generateBusinessEntity(faker.company.name(), 'businessName', 'typeBusiness', overrides);

export const generateMockRestaurant = (overrides: Record<string, unknown> = {}) =>
    generateBusinessEntity(faker.company.name(), 'restaurantName', 'typeBusiness', overrides);

export const generateMockDoctor = (overrides: Record<string, unknown> = {}) =>
    generateMedicalEntity(faker.person.fullName(), 'doctorName', {
        specialization: faker.helpers.arrayElement(['General', 'Pediatrics', 'Cardiology']),
        ...overrides,
    });

export const generateMockMarket = (overrides: Record<string, unknown> = {}) =>
    generateBusinessEntity(faker.company.name(), 'marketName', 'typeBusiness', overrides);

export const generateMockSanctuary = (overrides: Record<string, unknown> = {}) =>
    generateBusinessEntity(faker.company.name(), 'sanctuaryName', 'typeBusiness', overrides);

export const generateMockRecipe = (overrides: Record<string, unknown> = {}) => generateRecipeEntity(overrides);

export const generateMockPost = (overrides: Record<string, unknown> = {}) =>
    generateContentEntity(faker.lorem.words(5), {
        author: faker.database.mongodbObjectId(),
        tags: Array.from({ length: 3 }, () => faker.lorem.word()),
        likes: faker.number.int({ min: 0, max: 100 }),
        ...overrides,
    });

export const generateMockReview = (overrides: Record<string, unknown> = {}) => generateReviewEntity(overrides);

// Common mock request/response helpers
export const createMockReqRes = (
    body: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
    user: TestUser | null = null
) => {
    const req = {
        body,
        params,
        user,
        query: {},
        headers: {},
    } as unknown as Request;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
};

// Generic controller test patterns
interface ControllerTestConfig {
    endpoint: string;
    serviceMock: Mock;
    expectedMessage?: string;
}

export const testControllerOperation = async (
    app: Express,
    method: 'get' | 'post' | 'put' | 'delete',
    config: ControllerTestConfig,
    requestData?: Record<string, unknown>,
    expectedData?: unknown
) => {
    const { endpoint, serviceMock, expectedMessage } = config;

    if (expectedData) {
        serviceMock.mockResolvedValueOnce(expectedData);
    }

    let response: request.Response;

    switch (method) {
        case 'get':
            response = await request(app).get(endpoint);
            break;
        case 'post':
            response = await request(app)
                .post(endpoint)
                .send(requestData || {});
            break;
        case 'put':
            response = await request(app)
                .put(endpoint)
                .send(requestData || {});
            break;
        case 'delete':
            response = await request(app).delete(endpoint);
            break;
        default:
            throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Assert response based on operation type
    switch (method) {
        case 'get':
            expectSuccessResponse(response, 200, expectedMessage || 'Resource fetched successfully', expectedData);
            break;
        case 'post':
            expectResourceCreated(response, expectedMessage || 'Resource created successfully', expectedData);
            break;
        case 'put':
            expectResourceUpdated(response, expectedMessage || 'Resource updated successfully', expectedData);
            break;
        case 'delete':
            expectResourceDeleted(response, expectedMessage || 'Resource deleted successfully');
            break;
    }

    expect(serviceMock).toHaveBeenCalledTimes(1);

    return response;
};

// Simplified controller test functions
export const testControllerGetAll = async (
    app: Express,
    endpoint: string,
    serviceMock: Mock,
    expectedData: unknown[],
    expectedMessage: string = 'Resources fetched successfully'
) => testControllerOperation(app, 'get', { endpoint, serviceMock, expectedMessage }, undefined, expectedData);

export const testControllerGetById = async (
    app: Express,
    endpoint: string,
    serviceMock: Mock,
    expectedData: unknown,
    expectedMessage: string = 'Resource fetched successfully'
) => testControllerOperation(app, 'get', { endpoint, serviceMock, expectedMessage }, undefined, expectedData);

export const testControllerCreate = async (
    app: Express,
    endpoint: string,
    serviceMock: Mock,
    requestData: Record<string, unknown>,
    expectedData: unknown,
    expectedMessage: string = 'Resource created successfully'
) => testControllerOperation(app, 'post', { endpoint, serviceMock, expectedMessage }, requestData, expectedData);

export const testControllerUpdate = async (
    app: Express,
    endpoint: string,
    serviceMock: Mock,
    requestData: Record<string, unknown>,
    expectedData: unknown,
    expectedMessage: string = 'Resource updated successfully'
) => testControllerOperation(app, 'put', { endpoint, serviceMock, expectedMessage }, requestData, expectedData);

export const testControllerDelete = async (
    app: Express,
    endpoint: string,
    serviceMock: Mock,
    expectedMessage: string = 'Resource deleted successfully'
) => testControllerOperation(app, 'delete', { endpoint, serviceMock, expectedMessage });

// Common auth mock setup
export const setupAuthMocks = () => {
    const mockAuthUser: TestUser = generateMockUser({
        _id: 'testUserId',
        username: 'testUser',
        email: 'test@example.com',
        role: 'user',
    });

    const mockAuthMiddleware = {
        protect: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
            req.user = mockAuthUser;
            next();
        },
        admin: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
        professional: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
    };

    return { mockAuthUser, mockAuthMiddleware };
};

// Common service mock setup
export const setupServiceMocks = () => ({
    getAll: vi.fn(),
    getAllCached: vi.fn(),
    findById: vi.fn(),
    findByIdCached: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateById: vi.fn(),
    delete: vi.fn(),
    deleteById: vi.fn(),
    addReview: vi.fn(),
    getTopRatedReviews: vi.fn(),
});

// Common test setup patterns
export const setupControllerTest = () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    return {
        ...setupAuthMocks(),
        ...setupServiceMocks(),
    };
};

// Re-export response expectations for backward compatibility
export {
    expectSuccessResponse,
    expectErrorResponse,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted,
    expectResourceNotFound,
    expectUnauthorized,
    expectValidationError,
};

export default {
    expectSuccessResponse,
    expectErrorResponse,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted,
    expectResourceNotFound,
    expectUnauthorized,
    expectValidationError,
    generateMockUser,
    generateMockBusiness,
    generateMockRestaurant,
    generateMockDoctor,
    generateMockMarket,
    generateMockSanctuary,
    generateMockRecipe,
    generateMockPost,
    generateMockReview,
    createMockReqRes,
    testControllerGetAll,
    testControllerGetById,
    testControllerCreate,
    testControllerUpdate,
    testControllerDelete,
    setupAuthMocks,
    setupServiceMocks,
    setupControllerTest,
};
