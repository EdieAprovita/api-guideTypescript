/**
 * Centralized controller test helpers to eliminate duplication
 * This file consolidates common patterns used across controller tests
 */

import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import { Express } from 'express';
import { MockResponse, MockRequest, TestUser } from '../types/mockTypes';

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
    user?: TestUser | null;
}

// Common response expectation helpers
export const expectSuccessResponse = (
    response: request.Response,
    expectedStatus: number = 200,
    expectedMessage?: string,
    expectedData?: unknown
) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    if (expectedMessage) {
        expect(response.body.message).toBe(expectedMessage);
    }
    if (expectedData) {
        expect(response.body.data).toEqual(expectedData);
    }
};

export const expectErrorResponse = (
    response: request.Response,
    expectedStatus: number,
    expectedMessage: string,
    expectedError?: string
) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(expectedMessage);
    if (expectedError) {
        expect(response.body.error).toBe(expectedError);
    }
};

export const expectResourceCreated = (
    response: request.Response,
    expectedMessage: string = 'Resource created successfully',
    expectedData?: unknown
) => {
    expectSuccessResponse(response, 201, expectedMessage, expectedData);
};

export const expectResourceUpdated = (
    response: request.Response,
    expectedMessage: string = 'Resource updated successfully',
    expectedData?: unknown
) => {
    expectSuccessResponse(response, 200, expectedMessage, expectedData);
};

export const expectResourceDeleted = (
    response: request.Response,
    expectedMessage: string = 'Resource deleted successfully'
) => {
    expectSuccessResponse(response, 200, expectedMessage);
};

export const expectResourceNotFound = (response: request.Response, expectedMessage: string = 'Resource not found') => {
    expectErrorResponse(response, 404, expectedMessage);
};

export const expectUnauthorized = (response: request.Response, expectedMessage: string = 'Unauthorized access') => {
    expectErrorResponse(response, 401, expectedMessage);
};

export const expectValidationError = (response: request.Response, expectedMessage: string = 'Validation failed') => {
    expectErrorResponse(response, 400, expectedMessage);
};

// Common test data generators
export const generateMockUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    role: 'user',
    isActive: true,
    isDeleted: false,
    photo: 'default.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const generateMockBusiness = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    businessName: faker.company.name(),
    description: faker.lorem.sentence(),
    typeBusiness: faker.helpers.arrayElement(['vegan', 'vegetarian', 'organic']),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    website: faker.internet.url(),
    address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode(),
    },
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    ...overrides,
});

export const generateMockRestaurant = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    restaurantName: faker.company.name(),
    description: faker.lorem.sentence(),
    typeBusiness: faker.helpers.arrayElement(['vegan', 'vegetarian', 'organic']),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    website: faker.internet.url(),
    address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode(),
    },
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    ...overrides,
});

export const generateMockDoctor = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    doctorName: faker.person.fullName(),
    specialization: faker.helpers.arrayElement(['General', 'Pediatrics', 'Cardiology']),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode(),
    },
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    ...overrides,
});

export const generateMockMarket = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    marketName: faker.company.name(),
    description: faker.lorem.sentence(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode(),
    },
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    ...overrides,
});

export const generateMockSanctuary = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    sanctuaryName: faker.company.name(),
    description: faker.lorem.sentence(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode(),
    },
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    ...overrides,
});

export const generateMockRecipe = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    ingredients: Array.from({ length: 3 }, () => faker.lorem.word()),
    instructions: Array.from({ length: 3 }, () => faker.lorem.sentence()),
    cookingTime: faker.number.int({ min: 10, max: 120 }),
    servings: faker.number.int({ min: 1, max: 8 }),
    difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
    ...overrides,
});

export const generateMockPost = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    title: faker.lorem.words(5),
    content: faker.lorem.paragraph(),
    author: faker.database.mongodbObjectId(),
    tags: Array.from({ length: 3 }, () => faker.lorem.word()),
    likes: faker.number.int({ min: 0, max: 100 }),
    ...overrides,
});

export const generateMockReview = (overrides: Record<string, unknown> = {}) => ({
    _id: faker.database.mongodbObjectId(),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.lorem.sentence(),
    user: faker.database.mongodbObjectId(),
    refId: faker.database.mongodbObjectId(),
    refModel: faker.helpers.arrayElement(['Restaurant', 'Doctor', 'Market', 'Sanctuary']),
    ...overrides,
});

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
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    return { req, res, next };
};

// Common controller test patterns
export const testControllerGetAll = async (
    app: Express,
    endpoint: string,
    serviceMock: jest.Mock,
    expectedData: unknown[],
    expectedMessage: string = 'Resources fetched successfully'
) => {
    serviceMock.mockResolvedValueOnce(expectedData);

    const response = await request(app).get(endpoint);

    expectSuccessResponse(response, 200, expectedMessage, expectedData);
    expect(serviceMock).toHaveBeenCalledTimes(1);
};

export const testControllerGetById = async (
    app: Express,
    endpoint: string,
    serviceMock: jest.Mock,
    expectedData: unknown,
    expectedMessage: string = 'Resource fetched successfully'
) => {
    serviceMock.mockResolvedValueOnce(expectedData);

    const response = await request(app).get(endpoint);

    expectSuccessResponse(response, 200, expectedMessage, expectedData);
    expect(serviceMock).toHaveBeenCalledTimes(1);
};

export const testControllerCreate = async (
    app: Express,
    endpoint: string,
    serviceMock: jest.Mock,
    requestData: Record<string, unknown>,
    expectedData: unknown,
    expectedMessage: string = 'Resource created successfully'
) => {
    serviceMock.mockResolvedValueOnce(expectedData);

    const response = await request(app).post(endpoint).send(requestData);

    expectResourceCreated(response, expectedMessage, expectedData);
    expect(serviceMock).toHaveBeenCalledWith(requestData);
};

export const testControllerUpdate = async (
    app: Express,
    endpoint: string,
    serviceMock: jest.Mock,
    requestData: Record<string, unknown>,
    expectedData: unknown,
    expectedMessage: string = 'Resource updated successfully'
) => {
    serviceMock.mockResolvedValueOnce(expectedData);

    const response = await request(app).put(endpoint).send(requestData);

    expectResourceUpdated(response, expectedMessage, expectedData);
    expect(serviceMock).toHaveBeenCalledWith(expect.any(String), requestData);
};

export const testControllerDelete = async (
    app: Express,
    endpoint: string,
    serviceMock: jest.Mock,
    expectedMessage: string = 'Resource deleted successfully'
) => {
    serviceMock.mockResolvedValueOnce({ message: expectedMessage });

    const response = await request(app).delete(endpoint);

    expectResourceDeleted(response, expectedMessage);
    expect(serviceMock).toHaveBeenCalledWith(expect.any(String));
};

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
export const setupServiceMocks = () => {
    const baseMock = {
        getAll: jest.fn(),
        getAllCached: jest.fn(),
        findById: jest.fn(),
        findByIdCached: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateById: jest.fn(),
        delete: jest.fn(),
        deleteById: jest.fn(),
        addReview: jest.fn(),
        getTopRatedReviews: jest.fn(),
    };

    return baseMock;
};

// Common test setup patterns
export const setupControllerTest = () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    return {
        ...setupAuthMocks(),
        ...setupServiceMocks(),
    };
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
