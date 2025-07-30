/**
 * Legacy Test Helpers Compatibility Layer
 * This file provides backward compatibility for existing test files
 * that import '../utils/testHelpers'. Redirects to the new unified system.
 */

// Only import mocks if not in integration test mode
let mockFactory: any = null;
if (process.env.NODE_ENV === 'test' && !process.env.INTEGRATION_TEST) {
    try {
        const { mockFactory: importedMockFactory } = require('../config/unified-test-config');
        mockFactory = importedMockFactory;
    } catch (error) {
        // Mock factory not available, continue without it
        console.warn('Mock factory not available, continuing without mocks');
    }
}

import { faker } from '@faker-js/faker';
import type { TestRequest, TestResponse, TestUser } from '../types/test-types';

// Ensure faker uses deterministic data
faker.seed(12345);

// Legacy request/response creators
export function createMockRequest(overrides: Partial<TestRequest> = {}): TestRequest {
    if (!mockFactory) {
        // Return a basic mock request for integration tests
        return {
            params: {},
            query: {},
            body: {},
            headers: {},
            user: undefined,
            ...overrides,
        } as TestRequest;
    }
    return mockFactory.createExpressRequestMock(overrides);
}

export function createMockResponse(): TestResponse {
    if (!mockFactory) {
        // Return a basic mock response for integration tests
        return {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        } as TestResponse;
    }
    return mockFactory.createExpressResponseMock();
}

// Legacy service mock creators
export function createBaseServiceMock() {
    return {
        findAll: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
    };
}

export function setupServiceTest() {
    return {
        beforeEach: () => {
            vi.clearAllMocks();
        },
        afterEach: () => {
            vi.resetAllMocks();
        },
    };
}

// Legacy data creators - Object with methods for backward compatibility
export const createMockData = {
    // Generic data creator
    create: (type: string = 'default', overrides: any = {}) => {
        const baseData = {
            _id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            updatedAt: faker.date.recent(),
            ...overrides,
        };

        switch (type) {
            case 'user':
                return {
                    ...baseData,
                    username: faker.internet.userName(),
                    email: faker.internet.email(),
                    role: 'user',
                    isActive: true,
                    isDeleted: false,
                };
            case 'business':
                return {
                    ...baseData,
                    name: faker.company.name(),
                    description: faker.lorem.paragraph(),
                    category: faker.lorem.word(),
                    location: {
                        latitude: faker.location.latitude(),
                        longitude: faker.location.longitude(),
                    },
                };
            default:
                return baseData;
        }
    },

    // Specific data creators for backward compatibility
    restaurant: (overrides: any = {}) => {
        // Create a new seeded instance for consistent data
        const seededFaker = faker;
        seededFaker.seed(12345);
        
        return {
            _id: overrides._id || 'restaurant-1',
            name: 'Test Restaurant',
            description: 'A test restaurant for unit testing',
            category: 'restaurant',
            cuisine: 'test-cuisine',
            address: '123 Test Street',
            phone: '555-0123',
            email: 'test@restaurant.com',
            rating: 4.5,
            location: {
                type: 'Point',
                coordinates: [-74.006, 40.7128],
            },
            businessHours: {
                monday: { open: '09:00', close: '21:00' },
                tuesday: { open: '09:00', close: '21:00' },
                wednesday: { open: '09:00', close: '21:00' },
                thursday: { open: '09:00', close: '21:00' },
                friday: { open: '09:00', close: '22:00' },
                saturday: { open: '10:00', close: '22:00' },
                sunday: { open: '10:00', close: '20:00' },
            },
            isActive: true,
            isVerified: true,
            createdAt: new Date('2023-01-01T10:00:00Z'),
            updatedAt: new Date('2023-01-01T10:00:00Z'),
            ...overrides,
        };
    },

    business: (overrides: any = {}) => ({
        _id: overrides._id || 'business-1',
        name: 'Test Business',
        description: 'A test business for unit testing',
        category: 'test-category',
        subcategory: 'test-subcategory',
        address: '456 Business Ave',
        phone: '555-0456',
        email: 'test@business.com',
        website: 'https://test-business.com',
        rating: 4.0,
        location: {
            type: 'Point',
            coordinates: [-73.935, 40.7309],
        },
        businessHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '10:00', close: '16:00' },
            sunday: { closed: true },
        },
        isActive: true,
        isVerified: true,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        ...overrides,
    }),

    user: (overrides: any = {}) => ({
        _id: overrides._id || 'user-1',
        userId: overrides.userId || 'user-1',
        username: 'testuser',
        email: 'test@user.com',
        role: 'user',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'default.png',
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        ...overrides,
    }),

    review: (overrides: any = {}) => ({
        _id: overrides._id || 'review-1',
        businessId: overrides.businessId || 'business-1',
        userId: overrides.userId || 'user-1',
        rating: 5,
        comment: 'Great test review for unit testing',
        isVerified: true,
        isActive: true,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        ...overrides,
    }),
};

// Re-export vitest functions for convenience
import { vi } from 'vitest';
export { vi };

// Token generation utilities
import jwt from 'jsonwebtoken';

/**
 * Generates an expired JWT token for testing
 */
export const generateExpiredToken = (userId: string = 'test-user-id'): string => {
    const payload = {
        userId: userId,
        email: 'test@example.com',
        role: 'user'
    };

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
    
    return jwt.sign(payload, secret, {
        expiresIn: '-1h', // Expired 1 hour ago
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client'
    });
};

/**
 * Generates a valid JWT token for testing
 */
export const generateValidToken = (userId: string = 'test-user-id', role: string = 'user'): string => {
    const payload = {
        userId: userId,
        email: 'test@example.com',
        role: role
    };

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
    
    return jwt.sign(payload, secret, {
        expiresIn: '1h',
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client'
    });
};

/**
 * Generates an invalid JWT token for testing
 */
export const generateInvalidToken = (): string => {
    return 'invalid.jwt.token';
};

/**
 * Generates a token with wrong secret for testing
 */
export const generateTokenWithWrongSecret = (userId: string = 'test-user-id'): string => {
    const payload = {
        userId: userId,
        email: 'test@example.com',
        role: 'user'
    };

    return jwt.sign(payload, 'wrong-secret', {
        expiresIn: '1h',
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client'
    });
};