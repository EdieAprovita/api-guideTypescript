import request from 'supertest';
import { Application } from 'express';
import { TestUser, MockRestaurant, MockDoctor, MockMarket, MockSanctuary } from '../types';
import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';

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
export const expectSuccessResponse = (response: any, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    return response.body;
};

/**
 * Helper to expect an error response
 */
export const expectErrorResponse = (response: any, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    if (response.body.success !== undefined) {
        expect(response.body).toHaveProperty('success', false);
    }
    return response.body;
};

/**
 * Helper to expect a validation error
 */
export const expectValidationError = (response: any) => {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    return response.body;
};

/**
 * Helper to expect an unauthorized error
 */
export const expectUnauthorizedError = (response: any) => {
    expect(response.status).toBe(401);
    return response.body;
};

/**
 * Helper to expect a forbidden error
 */
export const expectForbiddenError = (response: any) => {
    expect(response.status).toBe(403);
    return response.body;
};

/**
 * Helper to expect a not found error
 */
export const expectNotFoundError = (response: any) => {
    expect(response.status).toBe(404);
    return response.body;
};

/**
 * Helper to test pagination responses
 */
export const expectPaginatedResponse = (response: any) => {
    expectSuccessResponse(response);
    expect(response.body.data).toBeInstanceOf(Array);
    // Add more pagination checks if needed
    return response.body;
};

/**
 * Helper to test resource creation
 */
export const expectResourceCreated = (response: any) => {
    expectSuccessResponse(response, 201);
    expect(response.body.data).toHaveProperty('_id');
    return response.body.data;
};

/**
 * Helper to test resource update
 */
export const expectResourceUpdated = (response: any) => {
    expectSuccessResponse(response);
    expect(response.body.data).toHaveProperty('_id');
    return response.body.data;
};

/**
 * Helper to test resource deletion
 */
export const expectResourceDeleted = (response: any) => {
    expectSuccessResponse(response);
    return response.body;
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
export const expectMockToHaveBeenCalledWith = (mockFn: jest.Mock, ...expectedArgs: any[]) => {
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
    category: 'restaurant',
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
