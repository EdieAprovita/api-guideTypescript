import request from 'supertest';
import { Application } from 'express';
import { TestUser, MockRestaurant, MockDoctor, MockMarket, MockSanctuary } from '../types';

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
