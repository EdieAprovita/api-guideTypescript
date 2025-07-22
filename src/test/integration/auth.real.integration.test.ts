import { faker } from '@faker-js/faker';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

// Clear all mocks to ensure integration tests use real implementations
jest.clearAllMocks();
jest.resetAllMocks();

// CRITICAL: Disable all automatic mocks for integration tests
jest.unmock('../../app');
jest.unmock('../../services/UserService');
jest.unmock('../../controllers/userControllers');
jest.unmock('../../middleware/authMiddleware');
jest.unmock('../../middleware/validation');
jest.unmock('../../middleware/security');
jest.unmock('../../utils/validators');
jest.unmock('../../models/User');
jest.unmock('../../services/TokenService');
jest.unmock('bcryptjs');

// Force Jest to use real implementations by resetting module registry
jest.resetModules();

import app from '../../app';
import {
    connect as connectTestDB,
    closeDatabase as disconnectTestDB,
    clearDatabase as clearTestDB,
} from './helpers/testDb';
import { createTestUser, createAdminUser } from './helpers/testFixtures';
import { generateAuthTokens } from './helpers/testFixtures';
import { logTestError } from './helpers/errorLogger';
import { User } from '../../models/User';
import TokenService from '../../services/TokenService';
import testConfig from '../testConfig';

// Aumentar el timeout global para todos los tests de integración
jest.setTimeout(45000);

// Interfaces for type safety
interface ApiResponse {
    status: number;
    body: {
        message?: string;
        error?: string;
        errors?: Array<{ message: string; field?: string }>;
        token?: string;
        user?: {
            _id: string;
            username: string;
            email: string;
            role: string;
        };
        data?: {
            accessToken?: string;
            refreshToken?: string;
            _id?: string;
        };
        success?: boolean;
    };
}

interface UserData {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
}

interface TestUser {
    _id: string;
    username: string;
    email: string;
    role: string;
    password: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

// Helper functions to reduce duplication
const expectUnauthorizedResponse = (response: ApiResponse) => {
    expect(response.status).toBe(401);
    expect(response.body.message || response.body.error || response.body.errors?.[0]?.message).toBeDefined();
};

const expectBadRequestResponse = (response: ApiResponse) => {
    expect(response.status).toBe(400);
    expect(response.body.message || response.body.error || response.body.errors?.[0]?.message).toBeDefined();
};

const expectSuccessResponse = (response: ApiResponse, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
};

const createUserData = (overrides: UserData = {}): UserData => ({
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: testConfig.generators.securePassword(),
    role: 'user',
    ...overrides,
});

const makeLoginRequest = (email: string, password: string) =>
    request(app)
        .post('/api/v1/users/login')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send({ email, password });

const makeRegisterRequest = (userData: UserData) =>
    request(app).post('/api/v1/users/register').set('User-Agent', 'test-agent').set('API-Version', 'v1').send(userData);

const makeAuthRequest = (method: 'get' | 'post', path: string, token?: string) => {
    const req = request(app)[method](path).set('User-Agent', 'test-agent').set('API-Version', 'v1');
    if (token) {
        req.set('Authorization', `Bearer ${token}`);
    }
    return req;
};

const setupUserAndTokens = async (isAdmin = false): Promise<{ user: TestUser; tokens: AuthTokens }> => {
    try {
        const plainPassword = testConfig.generators.securePassword();
        const user = isAdmin
            ? await createAdminUser({ password: plainPassword })
            : await createTestUser({ password: plainPassword });

        if (!user || !user._id) {
            throw new Error('Failed to create test user');
        }

        const tokens = await generateAuthTokens(user._id.toString(), user.email, user.role);

        if (!tokens || !tokens.accessToken) {
            throw new Error('Failed to generate auth tokens');
        }

        return {
            user: {
                _id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
                password: plainPassword,
            } as TestUser,
            tokens: tokens as AuthTokens,
        };
    } catch (error) {
        logTestError('setupUserAndTokens', error);
        throw error;
    }
};

describe('Authentication Flow Real Integration Tests', () => {
    beforeAll(async () => {
        try {
            await connectTestDB();
            console.log('Test database connected successfully');
        } catch (error) {
            console.error('Failed to connect test database:', error);
            throw error;
        }
    });

    afterEach(async () => {
        await clearTestDB();
        // Clear Redis mock storage between tests if method exists
        if (typeof TokenService.clearAllForTesting === 'function') {
            await TokenService.clearAllForTesting();
        }
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('should refresh access token with valid refresh token', async () => {
            // Create fresh user and tokens for this test
            const setup = await setupUserAndTokens();
            const tokens = setup.tokens;

            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send({
                    refreshToken: tokens.refreshToken,
                });

            console.log('Refresh token response:', {
                status: response.status,
                body: response.body,
                refreshTokenProvided: !!tokens.refreshToken,
                refreshTokenLength: tokens.refreshToken?.length,
            });

            expectSuccessResponse(response);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');

            // New access token should be different
            expect(response.body.data.accessToken).not.toBe(tokens.accessToken);
        });
    });
});
