import request from 'supertest';
import { Application } from 'express';
import { TestUser, MockRestaurant, MockDoctor, MockMarket, MockSanctuary } from '../types';
import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import { Response as SupertestResponse } from 'supertest';
import { MockedFunction } from 'jest-mock';
import jwt from 'jsonwebtoken';

/**
 * Create a test user with default values
 */
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: 'test-user-id',
    role: 'user',
    email: 'test@example.com',
    ...overrides,
});

/**
 * Create an admin test user
 */
export const createAdminUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: 'admin-user-id',
    role: 'admin',
    email: 'admin@example.com',
    ...overrides,
});

/**
 * Create a professional test user
 */
export const createProfessionalUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: 'professional-user-id',
    role: 'professional',
    email: 'professional@example.com',
    ...overrides,
});

/**
 * Create an authenticated request with a specific user
 */
export const createAuthenticatedRequest = (app: Application, user: TestUser = createTestUser()) => {
    // The global mock will handle authentication automatically
    // This function is for consistency and future extensibility
    return request(app);
};

/**
 * Helper to expect a successful response
 */
export const expectSuccessResponse = (response: SupertestResponse, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
};

/**
 * Helper to expect an error response
 */
export const expectErrorResponse = (response: SupertestResponse, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBeDefined();
    expect(typeof response.body.message).toBe('string');
};

/**
 * Helper to expect a validation error
 */
export const expectValidationError = (response: SupertestResponse) => {
    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('validation');
};

/**
 * Helper to expect an unauthorized error
 */
export const expectUnauthorizedError = (response: SupertestResponse) => {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Unauthorized');
};

/**
 * Helper to expect a forbidden error
 */
export const expectForbiddenError = (response: SupertestResponse) => {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Forbidden');
};

/**
 * Helper to expect a not found error
 */
export const expectNotFoundError = (response: SupertestResponse) => {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not found');
};

/**
 * Helper to test pagination responses
 */
export const expectPaginatedResponse = (response: SupertestResponse) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(typeof response.body.pagination.total).toBe('number');
};

/**
 * Helper to test resource creation
 */
export const expectResourceCreated = (response: SupertestResponse) => {
    expect(response.status).toBe(201);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBeDefined();
};

/**
 * Helper to test resource update
 */
export const expectResourceUpdated = (response: SupertestResponse) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBeDefined();
};

/**
 * Helper to test resource deletion
 */
export const expectResourceDeleted = (response: SupertestResponse) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted');
};

/**
 * Helper to mock service methods consistently
 */
export const createServiceMocks = (serviceName: string) => ({
    getAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({ _id: 'mock-id', name: `Mock ${serviceName}` }),
    create: jest.fn().mockResolvedValue({ _id: 'new-id', name: `New ${serviceName}` }),
    updateById: jest.fn().mockResolvedValue({ _id: 'updated-id', name: `Updated ${serviceName}` }),
    deleteById: jest.fn().mockResolvedValue('Deleted successfully'),
});

/**
 * Helper to create consistent date strings for testing
 * Avoids Date object serialization issues in JSON responses
 */
const createTestTimestamp = () => {
    const now = new Date('2025-01-01T00:00:00.000Z');
    return {
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
};

/**
 * Helper to create mock data for different entities
 * Uses custom mock types to avoid Mongoose Document interface requirements
 */
export const createMockData = {
    user: (overrides = {}) => ({
        _id: 'user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        isDeleted: false,
        ...overrides,
    }),

    post: (overrides = {}) => ({
        _id: 'post-id',
        title: 'Test Post',
        content: 'Test content',
        author: 'user-id',
        likes: [],
        comments: [],
        ...overrides,
    }),

    business: (overrides = {}) => ({
        _id: 'business-id',
        name: 'Test Business',
        description: 'Test description',
        location: { type: 'Point', coordinates: [0, 0] },
        ...overrides,
    }),

    restaurant: (overrides = {}): MockRestaurant => ({
        _id: 'restaurant-id',
        restaurantName: 'Test Restaurant',
        author: 'author-id',
        typePlace: 'restaurant',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        image: 'test-image.jpg',
        budget: 'medium',
        contact: [],
        cuisine: ['Test Cuisine'],
        reviews: [],
        rating: 4.5,
        numReviews: 0,
        timestamps: createTestTimestamp(),
        ...overrides,
    }),

    doctor: (overrides = {}): MockDoctor => ({
        _id: 'doctor-id',
        doctorName: 'Dr. Test',
        author: 'author-id',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        image: 'test-doctor.jpg',
        budget: 'medium',
        contact: [],
        expertise: ['General Medicine'],
        reviews: [],
        rating: 4.5,
        numReviews: 0,
        timestamps: createTestTimestamp(),
        ...overrides,
    }),

    market: (overrides = {}): MockMarket => ({
        _id: 'market-id',
        marketName: 'Test Market',
        author: 'author-id',
        address: 'Test Market Address',
        location: { type: 'Point', coordinates: [0, 0] },
        image: 'test-market.jpg',
        typeMarket: 'supermarket',
        contact: [],
        reviews: [],
        rating: 4.0,
        numReviews: 0,
        timestamps: createTestTimestamp(),
        ...overrides,
    }),

    sanctuary: (overrides = {}): MockSanctuary => ({
        _id: 'sanctuary-id',
        sanctuaryName: 'Test Sanctuary',
        author: 'author-id',
        address: 'Test Sanctuary Address',
        location: { type: 'Point', coordinates: [0, 0] },
        image: 'test-sanctuary.jpg',
        typeofSanctuary: 'wildlife',
        animals: [],
        capacity: 100,
        caretakers: ['Test Caretaker'],
        contact: [],
        reviews: [],
        rating: 4.8,
        numReviews: 0,
        timestamps: createTestTimestamp(),
        ...overrides,
    }),
};

/**
 * Helper to wait for async operations in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to assert that a mock was called with specific parameters
 */
export const expectMockToHaveBeenCalledWith = <T extends unknown[]>(
    mockFn: MockedFunction<(...args: T) => unknown>, 
    ...expectedArgs: T
) => {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
};

/**
 * Helper to assert that a mock was called a specific number of times
 */
export const expectMockToHaveBeenCalledTimes = (mockFn: jest.Mock, times: number) => {
    expect(mockFn).toHaveBeenCalledTimes(times);
};

// === SHARED MOCK SETUP ===
export const createMockMiddleware = () => ({
    rateLimits: {
        api: (_req: Request, _res: Response, next: NextFunction) => next(),
        auth: (_req: Request, _res: Response, next: NextFunction) => next(),
        search: (_req: Request, _res: Response, next: NextFunction) => next(),
        register: (_req: Request, _res: Response, next: NextFunction) => next(),
    },
    securityHeaders: (_req: Request, _res: Response, next: NextFunction) => next(),
    enforceHTTPS: (_req: Request, _res: Response, next: NextFunction) => next(),
    configureHelmet: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    addCorrelationId: (_req: Request, _res: Response, next: NextFunction) => next(),
    requireAPIVersion: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    validateUserAgent: (_req: Request, _res: Response, next: NextFunction) => next(),
    limitRequestSize: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    detectSuspiciousActivity: (_req: Request, _res: Response, next: NextFunction) => next(),
    sanitizeInput: () => [(_req: Request, _res: Response, next: NextFunction) => next()],
    validateInputLength: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    validate: () => (_req: Request, _res: Response, next: NextFunction) => next(),
});

export const createMockAuthMiddleware = () => ({
    protect: (_req: Request, _res: Response, next: NextFunction) => next(),
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
});

export const createMockDatabase = () => ({
    connectDB: jest.fn().mockResolvedValue(undefined),
    disconnectDB: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
});

export const createMockLogger = () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
});

export const createMockExpressValidator = () => ({
    validationResult: jest.fn().mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    }),
});

// === TEST DATA GENERATORS ===
export const createMockUser = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    role: 'user',
    photo: 'default.png',
    isActive: true,
    isDeleted: false,
    ...overrides,
});

export const createMockBusiness = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    namePlace: faker.company.name(),
    address: faker.location.streetAddress(),
    contact: {
        phone: faker.phone.number(),
        email: faker.internet.email(),
    },
    image: faker.image.url(),
    hours: [
        {
            dayOfWeek: 'Monday',
            openTime: '8:00',
            closeTime: '18:00',
        },
    ],
    ...overrides,
});

export const createMockRestaurant = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    address: faker.location.streetAddress(),
            typeBusiness: 'restaurant',
    phone: faker.phone.number(),
    ...overrides,
});

export const createMockDoctor = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    name: faker.person.fullName(),
    specialty: faker.helpers.arrayElement(['Cardiology', 'Neurology', 'Pediatrics']),
    license: faker.string.alphanumeric(10),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    ...overrides,
});

export const createMockRecipe = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    ingredients: [faker.lorem.word(), faker.lorem.word()],
    instructions: [faker.lorem.sentence()],
    cookingTime: faker.number.int({ min: 10, max: 120 }),
    difficulty: faker.helpers.arrayElement(['Easy', 'Medium', 'Hard']),
    ...overrides,
});

export const createMockPost = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    title: faker.lorem.words(3),
    content: faker.lorem.paragraph(),
    author: faker.string.alphanumeric(24),
    tags: [faker.lorem.word()],
    ...overrides,
});

export const createMockReview = (overrides = {}) => ({
    _id: faker.string.alphanumeric(24),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.lorem.sentence(),
    businessId: faker.string.alphanumeric(24),
    userId: faker.string.alphanumeric(24),
    ...overrides,
});

// === TEST UTILITIES ===
export const createMockRequest = (body = {}, params = {}, user = null) =>
    ({
        body,
        params,
        user,
        headers: {},
        cookies: {},
    }) as unknown as Request;

export const createMockResponse = () =>
    ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
    }) as unknown as Response;

export const createMockNext = () => jest.fn() as NextFunction;

// === COMMON TEST SETUP ===
export const setupCommonMocks = () => {
    // Mock database connection
    jest.mock('../../config/db', () => createMockDatabase());

    // Mock middleware
    jest.mock('../../middleware/security', () => createMockMiddleware());
    jest.mock('../../middleware/validation', () => createMockMiddleware());
    jest.mock('../../middleware/authMiddleware', () => createMockAuthMiddleware());

    // Mock logger
    jest.mock('../../utils/logger', () => createMockLogger());

    // Mock express-validator
    jest.mock('express-validator', () => createMockExpressValidator());
};

export const resetMocks = () => {
    jest.clearAllMocks();

    // Reset validation result mock
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    });
};

// === VALIDATION ERROR HELPERS ===
export const createValidationError = (field: string, message: string) => ({
    isEmpty: () => false,
    array: () => [{ field, msg: message }],
});

// === PASSWORD HELPERS ===
export const generateTestPassword = () =>
    faker.internet.password({
        length: 12,
        pattern: /[A-Za-z0-9!@#$%^&*]/,
    });

export const generateWeakPassword = () => faker.string.alphanumeric(3);

// === TOKEN SERVICE TEST HELPERS ===

/**
 * Create standard mock payload for token tests
 */
export const createMockTokenPayload = (overrides: any = {}) => ({
    userId: 'user123',
    email: 'test@example.com',
    role: 'user',
    ...overrides
});

/**
 * Create mock JWT setup for tests
 */
export const setupJWTMocks = (mockJwt: any, options: { accessToken?: string; refreshToken?: string } = {}) => {
    const accessToken = options.accessToken || generateMockToken('access');
    const refreshToken = options.refreshToken || generateMockToken('refresh');
    
    mockJwt.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
        
    return { accessToken, refreshToken };
};

/**
 * Create Redis mock setup for token tests
 */
export const setupRedisMocks = (mockRedis: any) => {
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.ttl.mockResolvedValue(-1);
};

/**
 * Create JWT verification expectations
 */
export const expectJWTVerification = (mockJwt: any, payload: any, tokenType: 'access' | 'refresh') => {
    const secretKey = tokenType === 'access' ? 
        (process.env.JWT_ACCESS_SECRET || 'test-access-secret') : 
        (process.env.JWT_REFRESH_SECRET || 'test-refresh-secret');
    const expiresIn = tokenType === 'access' ? '15m' : '7d';
    
    expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        secretKey,
        {
            expiresIn,
            issuer: 'vegan-guide-api',
            audience: 'vegan-guide-client',
        }
    );
};

/**
 * Generate a mock token for testing
 */
export const generateMockToken = (type: 'access' | 'refresh' = 'access'): string => {
    const payload = {
        userId: faker.string.uuid(),
        type,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (type === 'access' ? 900 : 604800), // 15 min or 7 days
    };
    
    const secret = type === 'access' ? 
        (process.env.JWT_ACCESS_SECRET || 'test-access-secret') : 
        (process.env.JWT_REFRESH_SECRET || 'test-refresh-secret');
    
    return jwt.sign(payload, secret);
};

/**
 * Generate an expired token for testing
 */
export const generateExpiredToken = (): string => {
    const payload = {
        userId: faker.string.uuid(),
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago (expired)
    };
    
    const secret = process.env.JWT_SECRET || 'test-jwt-secret';
    return jwt.sign(payload, secret);
};

/**
 * Create error test helper
 */
export const testTokenError = async (
    mockJwt: any,
    errorMessage: string,
    testFunction: () => Promise<any>,
    expectedError: string
) => {
    mockJwt.verify.mockImplementation(() => {
        throw new Error(errorMessage);
    });

    await expect(testFunction()).rejects.toThrow(expectedError);
};

/**
 * Create Redis key expectation helper
 */
export const expectRedisKeyOperation = (mockRedis: any, operation: 'get' | 'del' | 'setex', key: string, value?: any) => {
    if (operation === 'setex' && value !== undefined) {
        expect(mockRedis[operation]).toHaveBeenCalledWith(key, expect.any(Number), value);
    } else {
        expect(mockRedis[operation]).toHaveBeenCalledWith(key);
    }
};

/**
 * Environment setup helper for tests
 */
export const setupTestEnvironment = (envVars: Record<string, string>) => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, ...envVars };
    
    return () => {
        process.env = originalEnv;
    };
};

// === SERVICE TEST HELPERS ===

/**
 * Create BaseService mock with standard CRUD operations
 */
export const createBaseServiceMock = (mockData: any[] = []) => {
    return {
        __esModule: true,
        default: class MockBaseService {
            async getAll() {
                return mockData;
            }
            async updateById(id: string, data: any) {
                return { _id: id, ...data };
            }
            async create(data: any) {
                return { _id: 'new-id', ...data };
            }
            async findById(id: string) {
                return mockData.find(item => item._id === id) || null;
            }
            async deleteById(_id: string): Promise<void> {
                // Mock delete operation
            }
        }
    };
};

/**
 * Setup common service test environment
 */
export const setupServiceTest = (_serviceName: string) => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    return {
        testGetAll: async (service: any, expectedLength: number = 2) => {
            const result = await service.getAll();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            if (expectedLength > 0) {
                expect(result).toHaveLength(expectedLength);
            }
            return result;
        },

        testCreate: async (service: any, testData: any) => {
            const result = await service.create(testData);
            expect(result).toBeDefined();
            expect(result._id).toBeDefined();
            return result;
        },

        testUpdate: async (service: any, id: string, updateData: any) => {
            const result = await service.updateById(id, updateData);
            expect(result).toBeDefined();
            expect(result._id).toBe(id);
            return result;
        }
    };
};

/**
 * Create standard service test data
 */
export const createServiceTestData = (entityName: string, count: number = 2) => {
    return Array.from({ length: count }, (_, index) => ({
        _id: `${entityName}-${index + 1}`,
        [`${entityName}Name`]: `Test ${entityName} ${index + 1}`,
        author: 'author-id',
        address: `Test Address ${index + 1}`,
        rating: 4.5,
        numReviews: 0,
        reviews: [],
        contact: [],
        timestamps: createTestTimestamp()
    }));
};

/**
 * Standard service test suite generator
 */
export const createServiceTestSuite = (serviceName: string, ServiceClass: any, mockData: any[]) => {
    return () => {
        const testUtils = setupServiceTest(serviceName);
        
        return {
            'should delegate getAll to the model': async () => {
                const service = new ServiceClass();
                await testUtils.testGetAll(service, mockData.length);
            }
        };
    };
};
