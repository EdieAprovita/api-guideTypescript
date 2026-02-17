import { vi } from 'vitest';

// CRITICAL: Unmock these services BEFORE any other imports for integration tests
vi.doUnmock('bcryptjs');
vi.doUnmock('../../../services/TokenService');
vi.doUnmock('jsonwebtoken');
vi.doUnmock('express-validator');

import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { User, IUser } from '../../../models/User.js';
import { Restaurant, IRestaurant } from '../../../models/Restaurant.js';
import { Business } from '../../../models/Business.js';
import { logTestError } from './errorLogger.js';
import { generateTestPassword } from '../../utils/passwordGenerator.js';
import { generateSecureUniqueId } from '../../utils/secureRandom.js';
import testConfig from '../../testConfig.js';

// Import real bcrypt for integration tests
const bcrypt = require('bcryptjs');

// UNIFIED DATA FACTORY - Use this for consistent test data across all tests
export const buildTestUser = (
    overrides: Partial<{
        userId: string;
        email: string;
        username: string;
        password: string;
        role: string;
        isAdmin: boolean;
        isActive: boolean;
    }> = {}
) => {
    const defaultUser = {
        userId: faker.database.mongodbObjectId(),
        email: faker.internet.email(),
        username: faker.internet.userName(),
        password: testConfig.generateTestPassword(),
        role: 'user',
        isAdmin: false,
        isActive: true,
    };

    return { ...defaultUser, ...overrides };
};

export const buildTestTokenPayload = (
    overrides: Partial<{
        userId: string;
        email: string;
        role: string;
    }> = {}
) => {
    const defaultPayload = {
        userId: faker.database.mongodbObjectId(),
        email: faker.internet.email(),
        role: 'user',
    };

    return { ...defaultPayload, ...overrides };
};

interface UserOverrides {
    password?: string;
    username?: string;
    email?: string;
    role?: 'user' | 'professional' | 'admin';
    isAdmin?: boolean;
    isActive?: boolean;
    isDeleted?: boolean;
    photo?: string;
    firstName?: string;
    lastName?: string;
}

export const createTestUser = async (overrides: UserOverrides = {}): Promise<IUser> => {
    try {
        // Generate plain password for compatibility
        const plainPassword = overrides.password || generateTestPassword();

        // Generate unique username and email to avoid conflicts
        const uniqueId = generateSecureUniqueId();

        // Create complete user data including password for integration tests
        const userData = {
            username: overrides.username || `testuser_${uniqueId}`,
            email: (overrides.email || `test_${uniqueId}@example.com`).toLowerCase(),
            password: plainPassword, // Include password for successful creation
            role: overrides.role || 'user',
            isAdmin: overrides.isAdmin || false,
            isActive: overrides.isActive !== undefined ? overrides.isActive : true,
            isDeleted: overrides.isDeleted || false,
            photo: overrides.photo || 'default.png',
            firstName: overrides.firstName,
            lastName: overrides.lastName,
        };

        // Create user with all required fields
        const user = await User.create(userData);

        if (!user) {
            throw new Error('User.create() returned null or undefined');
        }

        // Ensure user has toObject method (Mongoose document)
        if (typeof user.toObject !== 'function') {
            throw new Error('Created user is not a valid Mongoose document');
        }

        // Return user document directly for compatibility with test expectations
        return user;
    } catch (error) {
        logTestError('createTestUser', error);
        throw new Error(`Failed to create test user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const createAdminUser = async (overrides: UserOverrides = {}) => {
    return createTestUser({
        role: 'admin',
        isAdmin: true,
        ...overrides,
    });
};

export const createProfessionalUser = async (overrides: UserOverrides = {}) => {
    return createTestUser({
        role: 'professional',
        ...overrides,
    });
};

export const generateAuthTokens = async (userId: string, email: string, role?: string) => {
    try {
        // Ensure consistent JWT configuration across all tests
        const requiredEnvVars = {
            JWT_SECRET: 'test-jwt-secret-key-for-integration-tests-very-long-and-secure-key',
            JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-integration-tests-very-long-and-secure-key',
            JWT_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
        };

        // Set all required environment variables
        Object.entries(requiredEnvVars).forEach(([key, value]) => {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        });

        // Ensure we have a valid userId
        if (!userId) {
            throw new Error('userId is required for token generation');
        }

        // Ensure we have a valid email
        const userEmail = email || 'test@example.com';

        // Dynamically import TokenService to ensure we get the real one
        const { default: TokenServiceInstance } = await import('../../../services/TokenService');

        const tokenPair = await TokenServiceInstance.generateTokens(userId, userEmail, role || 'user');

        if (!tokenPair || !tokenPair.accessToken || !tokenPair.refreshToken) {
            throw new Error('TokenService.generateTokens returned invalid token pair');
        }

        // Verify the tokens are valid by attempting to verify them
        try {
            await TokenServiceInstance.verifyAccessToken(tokenPair.accessToken);
        } catch (error) {
            throw new Error(
                `Generated access token is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }

        return {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
        };
    } catch (error) {
        console.error('Token generation error:', error);
        throw new Error(`Failed to generate auth tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

interface RestaurantOverrides {
    restaurantName?: string;
    typePlace?: string;
    address?: string;
    location?: {
        type: string;
        coordinates: number[];
    };
    image?: string;
    budget?: string;
    contact?: Array<{
        phone?: string;
        facebook?: string;
        instagram?: string;
    }>;
    cuisine?: string[];
    rating?: number;
    numReviews?: number;
    reviews?: unknown[];
}

export const createTestRestaurant = async (authorId: string, overrides: RestaurantOverrides = {}) => {
    const restaurantData = {
        restaurantName: faker.company.name(),
        author: authorId,
        typePlace: faker.helpers.arrayElement(['restaurant', 'cafe', 'bar']),
        address: faker.location.streetAddress(),
        location: {
            type: 'Point',
            coordinates: [faker.location.longitude(), faker.location.latitude()],
        },
        image: faker.image.url(),
        budget: faker.helpers.arrayElement(['$', '$$', '$$$', '$$$$']),
        contact: [
            {
                phone: '1234567890', // Simple phone number string
                facebook: faker.internet.url(),
                instagram: `@${faker.internet.userName()}`,
            },
        ],
        cuisine: faker.helpers.arrayElements(['Italian', 'Mexican', 'Asian', 'Vegan', 'American'], 2),
        rating: 0,
        numReviews: 0,
        reviews: [],
        ...overrides,
    };

    try {
        const restaurant = await Restaurant.create(restaurantData);
        return restaurant;
    } catch (error) {
        logTestError('createTestRestaurant', error);
        throw new Error(
            `Failed to create test restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
};

interface BusinessOverrides {
    namePlace?: string;
    address?: string;
    location?: {
        type: string;
        coordinates: number[];
    };
    image?: string;
    contact?: Array<{
        phone?: string;
        email?: string;
        facebook?: string;
        instagram?: string;
    }>;
    budget?: number;
    typeBusiness?: string;
    hours?: Array<{
        dayOfWeek?: string;
        openTime?: string;
        closeTime?: string;
    }>;
    rating?: number;
    numReviews?: number;
    reviews?: unknown[];
}

export const createTestBusiness = async (authorId: string, overrides: BusinessOverrides = {}) => {
    const businessData = {
        namePlace: faker.company.name(),
        author: authorId,
        address: faker.location.streetAddress(),
        location: {
            type: 'Point',
            coordinates: [faker.location.longitude(), faker.location.latitude()],
        },
        image: faker.image.url(),
        contact: [
            {
                phone: faker.string.numeric(10), // Generate simple 10-digit number
                email: faker.internet.email(),
                facebook: faker.internet.url(),
                instagram: `@${faker.internet.userName()}`,
            },
        ],
        budget: faker.number.int({ min: 1, max: 100 }),
        typeBusiness: faker.helpers.arrayElement(['store', 'service', 'retail']),
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
    };

    try {
        const business = await Business.create(businessData);
        return business;
    } catch (error) {
        logTestError('createTestBusiness', error);
        throw new Error(`Failed to create test business: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const generateLocationQuery = (lat?: number, lng?: number, radius?: number) => {
    return {
        lat: lat ?? faker.location.latitude(),
        lng: lng ?? faker.location.longitude(),
        radius: radius ?? 5000,
    };
};

export const createMultipleRestaurants = async (authorId: string, count: number = 5) => {
    const restaurants: IRestaurant[] = [];

    for (let i = 0; i < count; i++) {
        const restaurant = await createTestRestaurant(authorId, {
            rating: faker.number.float({ min: 0, max: 5, multipleOf: 0.1 }),
            numReviews: faker.number.int({ min: 0, max: 100 }),
        });
        restaurants.push(restaurant);
    }

    return restaurants;
};

export const cleanupTestData = async () => {
    // Clean up any test data if needed
    await User.deleteMany({ email: { $regex: /@example\.(com|net|org)$/ } });
    await Restaurant.deleteMany({ restaurantName: { $regex: /^Test / } });
    await Business.deleteMany({ namePlace: { $regex: /^Test / } });
};
