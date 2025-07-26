import { vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { TestUser, MockRestaurant, MockBusiness, MockMarket, MockSanctuary } from '../types';
import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import { Response as SupertestResponse } from 'supertest';
import { MockedFunction, Mocked } from 'vitest';
import jwt from 'jsonwebtoken';
import testConfig from '../testConfig';

/**
 * Create a test user with default values - NO hardcoded data
 */
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    role: 'user',
    email: faker.internet.email(),
    ...overrides,
});

/**
 * Create an admin test user
 */
export const createAdminUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    role: 'admin',
    email: faker.internet.email(),
    ...overrides,
});

/**
 * Create a professional test user
 */
export const createProfessionalUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    role: 'professional',
    email: faker.internet.email(),
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
    getAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Mock ${serviceName}` }),
    create: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `New ${serviceName}` }),
    updateById: vi.fn().mockResolvedValue({ _id: faker.database.mongodbObjectId(), name: `Updated ${serviceName}` }),
    deleteById: vi.fn().mockResolvedValue('Deleted successfully'),
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
        _id: faker.database.mongodbObjectId(),
        email: faker.internet.email(),
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
        author: faker.database.mongodbObjectId(),
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

    doctor: (overrides = {}): MockBusiness => ({
        _id: 'doctor-id',
        name: 'Dr. Test',
        description: 'Test Doctor Description',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        contact: [],
        typeBusiness: 'doctor',
        reviews: [],
        rating: 4.5,
        isVerified: true,
        ...overrides,
    }),

    market: (overrides = {}): MockMarket => ({
        _id: 'market-id',
        name: 'Test Market',
        description: 'Test Market Description',
        address: 'Test Market Address',
        location: { type: 'Point', coordinates: [0, 0] },
        contact: [],
        reviews: [],
        rating: 4.0,
        isVerified: true,
        ...overrides,
    }),

    sanctuary: (overrides = {}): MockSanctuary => ({
        _id: 'sanctuary-id',
        name: 'Test Sanctuary',
        description: 'Test Sanctuary Description',
        address: 'Test Sanctuary Address',
        location: { type: 'Point', coordinates: [0, 0] },
        animals: [],
        website: 'https://test-sanctuary.com',
        contact: [],
        reviews: [],
        rating: 4.8,
        isVerified: true,
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
export const expectMockToHaveBeenCalledTimes = (
    mockFn: MockedFunction<(...args: unknown[]) => unknown>,
    times: number
) => {
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
    protect: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            username: faker.internet.userName(),
            role: 'user',
            isActive: true,
            isDeleted: false,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            photo: faker.image.avatar(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        next();
    }),
    admin: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            username: faker.internet.userName(),
            role: 'admin',
            isAdmin: true,
            isActive: true,
            isDeleted: false,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            photo: faker.image.avatar(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        next();
    }),
    professional: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            username: faker.internet.userName(),
            role: 'professional',
            isActive: true,
            isDeleted: false,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            photo: faker.image.avatar(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        next();
    }),
    requireAuth: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            username: faker.internet.userName(),
            role: 'user',
            isActive: true,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        next();
    }),
    checkOwnership: vi.fn(() => (req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: any };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            username: faker.internet.userName(),
            role: 'user',
            isActive: true,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        next();
    }),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
});

export const createMockDatabase = () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
    disconnectDB: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
});

export const createMockLogger = () => ({
    __esModule: true,
    default: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
});

export const createMockExpressValidator = () => ({
    validationResult: vi.fn().mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    }),
});

// === TEST DATA GENERATORS ===
// Backward compatibility exports - using centralized createMockData
export const createMockUser = createMockData.user;
export const createMockBusiness = createMockData.business;
export const createMockRestaurant = createMockData.restaurant;
export const createMockDoctor = createMockData.doctor;
export const createMockRecipe = (overrides = {}) => ({
    _id: faker.database.mongodbObjectId(),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    ingredients: [faker.lorem.word(), faker.lorem.word()],
    instructions: [faker.lorem.sentence()],
    cookingTime: faker.number.int({ min: 10, max: 120 }),
    difficulty: faker.helpers.arrayElement(['Easy', 'Medium', 'Hard']),
    ...overrides,
});
export const createMockPost = createMockData.post;
export const createMockReview = (overrides = {}) => ({
    _id: faker.database.mongodbObjectId(),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.lorem.sentence(),
    businessId: faker.database.mongodbObjectId(),
    userId: faker.database.mongodbObjectId(),
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
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
    }) as unknown as Response;

export const createMockNext = () => vi.fn() as NextFunction;

// === COMMON TEST SETUP ===
export const setupCommonMocks = () => {
    // Mock database connection
    vi.mock('../../config/db', () => createMockDatabase());

    // Mock middleware
    vi.mock('../../middleware/security', () => createMockMiddleware());
    vi.mock('../../middleware/validation', () => createMockMiddleware());
    vi.mock('../../middleware/authMiddleware', () => createMockAuthMiddleware());

    // Mock logger
    vi.mock('../../utils/logger', () => createMockLogger());

    // Mock express-validator
    vi.mock('express-validator', () => createMockExpressValidator());
};

export const resetMocks = () => {
    vi.clearAllMocks();

    // Reset validation result mock
    const { validationResult } = require('express-validator');
    if (validationResult && typeof validationResult.mockReturnValue === 'function') {
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
    }
};

// === VALIDATION ERROR HELPERS ===
export const createValidationError = (field: string, message: string) => ({
    isEmpty: () => false,
    array: () => [{ field, msg: message }],
});

// === PASSWORD HELPERS ===
// Import centralized password generators to eliminate duplication
import {
    generateTestPassword as generateCentralizedPassword,
    generateWeakPassword as generateCentralizedWeakPassword,
    generateUniquePassword,
    generateDeterministicPassword,
} from './passwordGenerator';

// Import centralized controller test helpers
import {
    expectSuccessResponse as expectControllerSuccessResponse,
    expectErrorResponse as expectControllerErrorResponse,
    expectResourceCreated as expectControllerResourceCreated,
    expectResourceUpdated as expectControllerResourceUpdated,
    expectResourceDeleted as expectControllerResourceDeleted,
} from './controllerTestHelpers';

export const generateTestPassword = generateCentralizedPassword;
export const generateWeakPassword = generateCentralizedWeakPassword;

// Additional password helpers
export const generateUniqueTestPassword = () => generateUniquePassword();
export const generateDeterministicTestPassword = (seed: string) => generateDeterministicPassword(seed);

// === TOKEN SERVICE TEST HELPERS ===

/**
 * Create standard mock payload for token tests
 * Uses deterministic data by default to prevent test failures
 */
export const createMockTokenPayload = (overrides: Record<string, unknown> = {}) => {
    // Use deterministic data by default, but allow faker for specific cases
    const useRandom = overrides.useRandom as boolean;
    delete overrides.useRandom;

    if (useRandom) {
        return {
            userId: faker.database.mongodbObjectId(),
            email: faker.internet.email(),
            role: 'user',
            ...overrides,
        };
    }

    return createDeterministicTestData.mockTokenPayload('user123', overrides);
};

/**
 * Create mock JWT setup for tests
 */
export const setupJWTMocks = (
    mockJwt: Mocked<typeof jwt>,
    options: { accessToken?: string; refreshToken?: string } = {}
) => {
    const accessToken = options.accessToken || generateMockToken('access');
    const refreshToken = options.refreshToken || generateMockToken('refresh');

    (mockJwt.sign as MockedFunction<typeof jwt.sign>)
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

    return { accessToken, refreshToken };
};

/**
 * Create Redis mock setup for token tests
 */
export const setupRedisMocks = (
    mockRedis: Mocked<{
        setex: MockedFunction<(key: string, ttl: number, value: string) => Promise<string>>;
        get: MockedFunction<(key: string) => Promise<string | null>>;
        del: MockedFunction<(key: string) => Promise<number>>;
        keys: MockedFunction<(pattern: string) => Promise<string[]>>;
        ttl: MockedFunction<(key: string) => Promise<number>>;
    }>
) => {
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.ttl.mockResolvedValue(-1);
};

/**
 * Create JWT verification expectations
 */
export const expectJWTVerification = (
    mockJwt: Mocked<typeof jwt>,
    payload: Record<string, unknown>,
    tokenType: 'access' | 'refresh'
) => {
    const secretKey =
        tokenType === 'access'
            ? process.env.JWT_ACCESS_SECRET || testConfig.generators.securePassword()
            : process.env.JWT_REFRESH_SECRET || testConfig.generators.securePassword();
    const expiresIn = tokenType === 'access' ? '15m' : '7d';

    expect(mockJwt.sign).toHaveBeenCalledWith(payload, secretKey, {
        expiresIn,
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client',
    });
};

/**
 * Generate a mock token for testing
 * Uses deterministic data by default to prevent test failures
 */
export const generateMockToken = (type: 'access' | 'refresh' = 'access', userId: string = 'user123'): string => {
    const payload = {
        userId,
        type,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (type === 'access' ? 900 : 604800), // 15 min or 7 days
    };

    const secret =
        type === 'access'
            ? process.env.JWT_ACCESS_SECRET || testConfig.generators.securePassword()
            : process.env.JWT_REFRESH_SECRET || testConfig.generators.securePassword();

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

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_12345';
    return jwt.sign(payload, secret);
};

/**
 * Create error test helper
 */
export const testTokenError = async (
    mockJwt: Mocked<typeof jwt>,
    errorMessage: string,
    testFunction: () => Promise<unknown>,
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
export const expectRedisKeyOperation = (
    mockRedis: Mocked<{
        setex: MockedFunction<(key: string, ttl: number, value: string) => Promise<string>>;
        get: MockedFunction<(key: string) => Promise<string | null>>;
        del: MockedFunction<(key: string) => Promise<number>>;
        keys: MockedFunction<(pattern: string) => Promise<string[]>>;
        ttl: MockedFunction<(key: string) => Promise<number>>;
    }>,
    operation: 'get' | 'del' | 'setex',
    key: string,
    value?: unknown
) => {
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
export const createBaseServiceMock = (mockData: Record<string, unknown>[] = []) => {
    return {
        __esModule: true,
        default: class MockBaseService {
            async getAll() {
                return mockData;
            }
            async updateById(id: string, data: Record<string, unknown>) {
                return { _id: id, ...data };
            }
            async create(data: Record<string, unknown>) {
                return { _id: faker.database.mongodbObjectId(), ...data };
            }
            async findById(id: string) {
                return mockData.find(item => item._id === id) || null;
            }
            async deleteById(_id: string): Promise<void> {
                // Mock delete operation
            }
        },
    };
};

/**
 * Setup common service test environment
 */
export const setupServiceTest = (_serviceName: string) => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    return {
        testGetAll: async (service: { getAll: () => Promise<unknown[]> }, expectedLength: number = 2) => {
            const result = await service.getAll();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            if (expectedLength > 0) {
                expect(result).toHaveLength(expectedLength);
            }
            return result;
        },

        testCreate: async (
            service: { create: (data: Record<string, unknown>) => Promise<{ _id: string }> },
            testData: Record<string, unknown>
        ) => {
            const result = await service.create(testData);
            expect(result).toBeDefined();
            expect(result._id).toBeDefined();
            return result;
        },

        testUpdate: async (
            service: { updateById: (id: string, data: Record<string, unknown>) => Promise<{ _id: string }> },
            id: string,
            updateData: Record<string, unknown>
        ) => {
            const result = await service.updateById(id, updateData);
            expect(result).toBeDefined();
            expect(result._id).toBe(id);
            return result;
        },
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
        timestamps: createTestTimestamp(),
    }));
};

/**
 * Standard service test suite generator
 */
export const createServiceTestSuite = (
    serviceName: string,
    ServiceClass: new () => { getAll: () => Promise<unknown[]> },
    mockData: Record<string, unknown>[]
) => {
    return () => {
        const testUtils = setupServiceTest(serviceName);

        return {
            'should delegate getAll to the model': async () => {
                const service = new ServiceClass();
                await testUtils.testGetAll(service, mockData.length);
            },
        };
    };
};

// === DETERMINISTIC TEST DATA HELPERS ===

/**
 * Create deterministic test data that doesn't change between test runs
 * Use these when you need predictable values for assertions
 */
export const createDeterministicTestData = {
    user: (id: string = '', overrides: Partial<TestUser> = {}): TestUser => {
        const validId = id.length === 24 ? id : faker.database.mongodbObjectId();
        return {
            _id: validId,
            role: 'user',
            email: `test-${validId.slice(-8)}@example.com`,
            ...overrides,
        };
    },

    adminUser: (id: string = '', overrides: Partial<TestUser> = {}): TestUser => {
        const validId = id.length === 24 ? id : faker.database.mongodbObjectId();
        return {
            _id: validId,
            role: 'admin',
            email: `admin-${validId.slice(-8)}@example.com`,
            ...overrides,
        };
    },

    professionalUser: (id: string = '', overrides: Partial<TestUser> = {}): TestUser => {
        const validId = id.length === 24 ? id : faker.database.mongodbObjectId();
        return {
            _id: validId,
            role: 'professional',
            email: `professional-${validId.slice(-8)}@example.com`,
            ...overrides,
        };
    },

    mockUser: (id: string = '', overrides = {}) => {
        const validId = id.length === 24 ? id : faker.database.mongodbObjectId();
        return {
            _id: validId,
            username: `testuser_${validId.slice(-8)}`,
            email: `test-${validId.slice(-8)}@example.com`,
            role: 'user',
            photo: 'default.png',
            isActive: true,
            isDeleted: false,
            ...overrides,
        };
    },

    mockTokenPayload: (userId: string = '', overrides: Record<string, unknown> = {}) => {
        const validUserId = userId.length === 24 ? userId : faker.database.mongodbObjectId();
        return {
            userId: validUserId,
            email: `test-${validUserId.slice(-8)}@example.com`,
            role: 'user',
            ...overrides,
        };
    },

    mockRestaurant: (id: string = 'restaurant123', overrides = {}): MockRestaurant => ({
        _id: id,
        name: `Test Restaurant ${id}`,
        description: 'Test Restaurant Description',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        contact: [
            {
                phone: '+1234567890',
                email: `restaurant-${id}@example.com`,
            },
        ],
        cuisine: 'Italian',
        reviews: [],
        rating: 4.5,
        isVerified: true,
        ...overrides,
    }),

    mockBusiness: (id: string = 'business123', overrides = {}): MockBusiness => ({
        _id: id,
        name: `Test Business ${id}`,
        description: 'Test Business Description',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        contact: [
            {
                phone: '+1234567890',
                email: `business-${id}@example.com`,
            },
        ],
        typeBusiness: 'doctor',
        reviews: [],
        rating: 4.5,
        isVerified: true,
        ...overrides,
    }),

    tokens: {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        expired: 'expired-token',
        invalid: 'invalid-token',
    },
};

// === SEED FAKER FOR PREDICTABLE TESTS ===

/**
 * Set up faker with a predictable seed for consistent test results
 * Call this in beforeEach if you need consistent faker data
 */
export const setupPredictableFaker = (seed: number = 12345) => {
    faker.seed(seed);
};
