import { Request, Response, NextFunction, Application } from 'express';
import request from 'supertest';
import { vi, MockedFunction } from 'vitest';
import { faker } from '@faker-js/faker';
import {
    generateValidObjectId,
    createTestUser,
    createAdminUser,
    createProfessionalUser,
} from '../config/unified-test-config.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'admin' | 'professional';
    isActive: boolean;
    isDeleted: boolean;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TestBusiness {
    _id: string;
    namePlace: string;
    author: string;
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    image: string;
    contact: Array<{
        phone?: string;
        email?: string;
        facebook?: string;
        instagram?: string;
    }>;
    budget: number;
    typeBusiness: 'restaurant' | 'cafe' | 'store' | 'service' | 'retail';
    hours: Array<{
        dayOfWeek: string;
        openTime: string;
        closeTime: string;
    }>;
    rating: number;
    numReviews: number;
    reviews: string[];
}

export interface TestRestaurant {
    _id: string;
    restaurantName: string;
    author: string;
    typePlace: 'restaurant' | 'cafe' | 'bar';
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    image: string;
    budget: '$' | '$$' | '$$$' | '$$$$';
    contact: Array<{
        phone?: string;
        facebook?: string;
        instagram?: string;
    }>;
    cuisine: string[];
    rating: number;
    numReviews: number;
    reviews: string[];
}

export interface TestReview {
    _id: string;
    rating: number;
    title: string;
    content: string;
    visitDate: Date;
    author: string;
    restaurant: string;
    helpfulCount: number;
    helpfulVotes: string[];
}

export interface TestRecipe {
    _id: string;
    title: string;
    author: string;
    description: string;
    instructions: string;
    ingredients: string[];
    typeDish: 'breakfast' | 'lunch' | 'dinner' | 'dessert';
    image: string;
    cookingTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    budget: '$' | '$$' | '$$$';
    rating: number;
    numReviews: number;
    reviews: string[];
}

export interface MockRequest extends Partial<Request> {
    body: Record<string, unknown>;
    params: Record<string, unknown>;
    query: Record<string, unknown>;
    headers: Record<string, unknown>;
    user?: TestUser | null;
    cookies?: Record<string, string>;
}

export interface MockResponse extends Partial<Response> {
    status: MockedFunction<(code: number) => MockResponse>;
    json: MockedFunction<(data: unknown) => MockResponse>;
    send: MockedFunction<(data: unknown) => MockResponse>;
    cookie: MockedFunction<(name: string, value: string, options?: unknown) => MockResponse>;
    clearCookie: MockedFunction<(name: string) => MockResponse>;
}

export interface TestResponse {
    status: number;
    body: {
        success: boolean;
        message?: string;
        error?: string;
        errors?: Array<{ field: string; message: string }>;
        data?: unknown;
    };
}

// ============================================================================
// MOCK CREATORS
// ============================================================================

export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    cookies: {},
    ...overrides,
});

export const createMockResponse = (): MockResponse => {
    const res = {} as MockResponse;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.cookie = vi.fn().mockReturnValue(res);
    res.clearCookie = vi.fn().mockReturnValue(res);
    return res;
};

export const createMockNext = (): MockedFunction<NextFunction> => vi.fn();

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

export const generateTestData = {
    user: createTestUser,
    admin: createAdminUser,
    professional: createProfessionalUser,

    business: (overrides: Partial<TestBusiness> = {}): TestBusiness => ({
        _id: generateValidObjectId(),
        namePlace: faker.company.name(),
        author: generateValidObjectId(),
        address: faker.location.streetAddress(),
        location: {
            type: 'Point' as const,
            coordinates: [faker.location.longitude(), faker.location.latitude()],
        },
        image: faker.image.url(),
        contact: [
            {
                phone: faker.string.numeric(10),
                email: faker.internet.email(),
                facebook: faker.internet.url(),
                instagram: `@${faker.internet.userName()}`,
            },
        ],
        budget: faker.number.int({ min: 1, max: 4 }),
        typeBusiness: faker.helpers.arrayElement(['restaurant', 'cafe', 'store', 'service', 'retail']),
        hours: [
            {
                dayOfWeek: 'Monday',
                openTime: '09:00',
                closeTime: '18:00',
            },
        ],
        rating: 0,
        numReviews: 0,
        reviews: [],
        ...overrides,
    }),

    restaurant: (overrides: Partial<TestRestaurant> = {}): TestRestaurant => ({
        _id: generateValidObjectId(),
        restaurantName: faker.company.name(),
        author: generateValidObjectId(),
        typePlace: faker.helpers.arrayElement(['restaurant', 'cafe', 'bar']),
        address: faker.location.streetAddress(),
        location: {
            type: 'Point' as const,
            coordinates: [faker.location.longitude(), faker.location.latitude()],
        },
        image: faker.image.url(),
        budget: faker.helpers.arrayElement(['$', '$$', '$$$', '$$$$']),
        contact: [
            {
                phone: faker.string.numeric(10),
                facebook: faker.internet.url(),
                instagram: `@${faker.internet.userName()}`,
            },
        ],
        cuisine: faker.helpers.arrayElements(['Italian', 'Mexican', 'Asian', 'Vegan'], 2),
        rating: 0,
        numReviews: 0,
        reviews: [],
        ...overrides,
    }),

    review: (overrides: Partial<TestReview> = {}): TestReview => ({
        _id: generateValidObjectId(),
        rating: faker.number.int({ min: 1, max: 5 }),
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        visitDate: faker.date.recent(),
        author: generateValidObjectId(),
        restaurant: generateValidObjectId(),
        helpfulCount: 0,
        helpfulVotes: [],
        ...overrides,
    }),

    recipe: (overrides: Partial<TestRecipe> = {}): TestRecipe => ({
        _id: generateValidObjectId(),
        title: faker.lorem.words(3),
        author: generateValidObjectId(),
        description: faker.lorem.paragraph(),
        instructions: faker.lorem.paragraphs(3),
        ingredients: Array.from({ length: 5 }, () => faker.lorem.word()),
        typeDish: faker.helpers.arrayElement(['breakfast', 'lunch', 'dinner', 'dessert']),
        image: faker.image.url(),
        cookingTime: faker.number.int({ min: 15, max: 120 }),
        difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
        budget: faker.helpers.arrayElement(['$', '$$', '$$$']),
        rating: 0,
        numReviews: 0,
        reviews: [],
        ...overrides,
    }),
};

// ============================================================================
// REQUEST HELPERS
// ============================================================================

export const makeRequest = {
    get: (app: Application, path: string, token?: string) => {
        const req = request(app).get(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },

    post: (app: Application, path: string, data?: unknown, token?: string) => {
        const req = request(app).post(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        if (data) req.send(data);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },

    put: (app: Application, path: string, data?: unknown, token?: string) => {
        const req = request(app).put(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        if (data) req.send(data);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },

    delete: (app: Application, path: string, token?: string) => {
        const req = request(app).delete(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },
};

// ============================================================================
// RESPONSE ASSERTIONS
// ============================================================================

export const expectResponse = {
    success: (response: TestResponse, expectedStatus = 200): void => {
        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(true);
        if (expectedStatus === 201) {
            expect(response.body.data).toBeDefined();
        }
    },

    error: (response: TestResponse, expectedStatus = 400): void => {
        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(false);
        expect(response.body.message || response.body.error).toBeDefined();
    },

    validation: (response: TestResponse): void => {
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors || response.body.message).toBeDefined();
    },

    unauthorized: (response: TestResponse): void => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    },

    forbidden: (response: TestResponse): void => {
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    },

    notFound: (response: TestResponse): void => {
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    },

    created: (response: TestResponse): void => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
    },

    deleted: (response: TestResponse): void => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    },

    paginated: (response: TestResponse): void => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
    },

    withToken: (response: TestResponse): void => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        const hasToken =
            response.body.data && typeof response.body.data === 'object' && 'accessToken' in response.body.data;
        expect(hasToken).toBe(true);
    },
};

// ============================================================================
// SERVICE MOCKS
// ============================================================================

export const createServiceMock = <T extends { _id: string }>(mockData: T[] = []) => ({
    getAll: vi.fn().mockResolvedValue(mockData),
    getAllCached: vi.fn().mockResolvedValue(mockData),
    findById: vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve(mockData.find((item: T) => item._id === id) || null)),
    findByIdCached: vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve(mockData.find((item: T) => item._id === id) || null)),
    create: vi
        .fn()
        .mockImplementation((data: Partial<T>) => Promise.resolve({ _id: generateValidObjectId(), ...data } as T)),
    createCached: vi
        .fn()
        .mockImplementation((data: Partial<T>) => Promise.resolve({ _id: generateValidObjectId(), ...data } as T)),
    updateById: vi
        .fn()
        .mockImplementation((id: string, data: Partial<T>) => Promise.resolve({ _id: id, ...data } as T)),
    updateByIdCached: vi
        .fn()
        .mockImplementation((id: string, data: Partial<T>) => Promise.resolve({ _id: id, ...data } as T)),
    deleteById: vi.fn().mockResolvedValue(undefined),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
});

// ============================================================================
// CRUD TEST GENERATOR
// ============================================================================

export const generateCrudTests = (config: {
    app: Application;
    basePath: string;
    serviceMock: ReturnType<typeof createServiceMock>;
    validData: unknown;
    updateData: unknown;
    resourceName: string;
    authToken?: string;
}) => {
    const { app, basePath, serviceMock, validData, updateData, resourceName, authToken } = config;

    return {
        testGetAll: () => {
            it(`should get all ${resourceName}s`, async () => {
                const mockData = [generateTestData.business()];
                serviceMock.getAll.mockResolvedValue(mockData);

                const response = await makeRequest.get(app, basePath, authToken);
                expectResponse.success(response);
                expect(serviceMock.getAll).toHaveBeenCalled();
            });
        },

        testGetById: () => {
            it(`should get ${resourceName} by id`, async () => {
                const mockData = generateTestData.business();
                serviceMock.findById.mockResolvedValue(mockData);

                const response = await makeRequest.get(app, `${basePath}/${mockData._id}`, authToken);
                expectResponse.success(response);
                expect(serviceMock.findById).toHaveBeenCalledWith(mockData._id);
            });
        },

        testCreate: () => {
            it(`should create ${resourceName}`, async () => {
                const mockData = { _id: generateValidObjectId(), ...validData };
                serviceMock.create.mockResolvedValue(mockData);

                const response = await makeRequest.post(app, basePath, validData, authToken);
                expectResponse.created(response);
                expect(serviceMock.create).toHaveBeenCalledWith(validData);
            });
        },

        testUpdate: () => {
            it(`should update ${resourceName}`, async () => {
                const id = generateValidObjectId();
                const mockData = { _id: id, ...updateData };
                serviceMock.updateById.mockResolvedValue(mockData);

                const response = await makeRequest.put(app, `${basePath}/${id}`, updateData, authToken);
                expectResponse.success(response);
                expect(serviceMock.updateById).toHaveBeenCalledWith(id, updateData);
            });
        },

        testDelete: () => {
            it(`should delete ${resourceName}`, async () => {
                const id = generateValidObjectId();
                serviceMock.deleteById.mockResolvedValue(undefined);

                const response = await makeRequest.delete(app, `${basePath}/${id}`, authToken);
                expectResponse.success(response);
                expect(serviceMock.deleteById).toHaveBeenCalledWith(id);
            });
        },

        runAllTests: () => {
            describe(`${resourceName} CRUD Operations`, () => {
                config.testGetAll();
                config.testGetById();
                config.testCreate();
                config.testUpdate();
                config.testDelete();
            });
        },
    };
};

// ============================================================================
// UTILITIES
// ============================================================================

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectMockCalled = <T extends unknown[]>(
    mockFn: MockedFunction<(...args: T) => unknown>,
    times?: number,
    ...expectedArgs: T
) => {
    if (times !== undefined) {
        expect(mockFn).toHaveBeenCalledTimes(times);
    }
    if (expectedArgs.length > 0) {
        expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
    }
};

export const resetAllMocks = () => {
    vi.clearAllMocks();
    vi.resetAllMocks();
};

export const setupMockConsole = () => {
    const originalConsole = { ...console };
    const mockConsole = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    };

    Object.assign(console, mockConsole);

    return {
        mockConsole,
        restore: () => Object.assign(console, originalConsole),
    };
};
