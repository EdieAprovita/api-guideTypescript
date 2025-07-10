import { faker } from '@faker-js/faker';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app';
import {
    connect as connectTestDB,
    closeDatabase as disconnectTestDB,
    clearDatabase as clearTestDB,
} from './helpers/testDb';
import { createTestUser, createAdminUser, generateAuthTokens } from './helpers/testFixtures';
import { User } from '../../models/User';
import TokenService from '../../services/TokenService';
import testConfig from '../testConfig';
import { generateExpiredToken } from '../utils/testHelpers';

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
    expect(response.body.message || response.body.error).toBeDefined();
};

const expectBadRequestResponse = (response: ApiResponse) => {
    expect(response.status).toBe(400);
    expect(response.body.message || response.body.error).toBeDefined();
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
                ...user.toObject(),
                password: plainPassword,
            } as TestUser,
            tokens: tokens as AuthTokens,
        };
    } catch (error) {
        console.error('Error in setupUserAndTokens:', error);
        throw error;
    }
};

describe('Authentication Flow Integration Tests', () => {
    beforeAll(async () => {
        // Clear any mocks to ensure real implementations are used
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();

        await connectTestDB();
    });

    afterEach(async () => {
        await clearTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    describe('POST /api/v1/users/register', () => {
        it('should register a new user and return JWT tokens', async () => {
            const userData = createUserData();

            const response = await request(app)
                .post('/api/v1/users/register')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(userData);

            // Debug: log response if it's not 201
            if (response.status !== 201) {
                console.log('Response status:', response.status);
                console.log('Response body:', response.body);
            }

            expectSuccessResponse(response, 201);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.user.username).toBe(userData.username);
            expect(response.body.user).not.toHaveProperty('password');

            // Verify user was created in database
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();
            expect(user?.username).toBe(userData.username);

            // Verify password was hashed
            const isPasswordValid = await bcrypt.compare(userData.password!, user?.password || '');
            expect(isPasswordValid).toBe(true);
        });

        it('should prevent duplicate email registration', async () => {
            const userData = createUserData({ email: 'duplicate@example.com' });

            // First registration
            await request(app).post('/api/v1/users/register').send(userData);

            // Attempt duplicate registration
            const response = await request(app)
                .post('/api/v1/users/register')
                .send(createUserData({ email: 'duplicate@example.com', username: 'different' }));

            expectBadRequestResponse(response);
            expect(response.body.errors?.[0]?.message || response.body.message).toContain('already exists');
        });

        it('should validate email format', async () => {
            const userData = createUserData({ email: 'invalid-email' });

            const response = await request(app).post('/api/v1/users/register').send(userData);

            expectBadRequestResponse(response);
            expect(response.body.errors?.[0]?.message || response.body.error).toContain('email');
        });

        it('should validate password strength', async () => {
            const userData = createUserData({ password: testConfig.passwords.weakPassword });

            const response = await request(app).post('/api/v1/users/register').send(userData);

            expectBadRequestResponse(response);
            expect(response.body.errors?.[0]?.message || response.body.error).toContain('password');
        });
    });

    describe('POST /api/v1/users/login', () => {
        let testUser: TestUser;
        const password = testConfig.passwords.validPassword;

        beforeEach(async () => {
            // Crear un usuario con una contraseña conocida para el test
            const plainPassword = testConfig.generators.securePassword();
            const user = await createTestUser({
                password: plainPassword,
            });
            testUser = { ...user.toObject(), password: plainPassword };
        });

        it('should login with valid credentials', async () => {
            const response = await makeLoginRequest(testUser.email, testUser.password);

            expectSuccessResponse(response);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user._id).toBe(testUser._id.toString());
        });

        it('should return valid JWT token', async () => {
            const response = await makeLoginRequest(testUser.email, testUser.password);

            expect(response.status).toBe(200);

            const { token } = response.body;

            // Verify token structure (basic JWT format check)
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3); // JWT has 3 parts
        });

        it('should fail with invalid password', async () => {
            const response = await makeLoginRequest(testUser.email, testConfig.passwords.wrongPassword);

            expectUnauthorizedResponse(response);
            expect(response.body.message).toContain('Invalid credentials');
        });

        it('should fail with non-existent email', async () => {
            const response = await makeLoginRequest(faker.internet.email(), testConfig.passwords.validPassword);

            expectUnauthorizedResponse(response);
            expect(response.body.message).toContain('Invalid credentials');
        });

        it('should handle rate limiting', async () => {
            // Make multiple failed login attempts
            const promises = Array(15)
                .fill(null)
                .map(() => makeLoginRequest(testUser.email, testConfig.passwords.wrongPassword));

            const responses = await Promise.all(promises);

            // Some requests should be rate limited
            const rateLimited = responses.filter(r => r.status === 429);
            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        let testUser: TestUser;
        let tokens: AuthTokens;

        beforeEach(async () => {
            const setup = await setupUserAndTokens();
            testUser = setup.user;
            tokens = setup.tokens;
        });

        it('should refresh access token with valid refresh token', async () => {
            const response = await request(app).post('/api/v1/auth/refresh-token').send({
                refreshToken: tokens.refreshToken,
            });

            expectSuccessResponse(response);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');

            // New access token should be different
            expect(response.body.data.accessToken).not.toBe(tokens.accessToken);
        });

        it('should invalidate old refresh token', async () => {
            // Use refresh token once
            await request(app).post('/api/v1/auth/refresh-token').send({
                refreshToken: tokens.refreshToken,
            });

            // Try to use same refresh token again
            const response = await request(app).post('/api/v1/auth/refresh-token').send({
                refreshToken: tokens.refreshToken,
            });

            expectUnauthorizedResponse(response);
            expect(response.body.message).toContain('Invalid refresh token');
        });

        it('should handle blacklisted tokens', async () => {
            // Blacklist the token
            await TokenService.blacklistToken(tokens.refreshToken);

            const response = await request(app).post('/api/v1/auth/refresh-token').send({
                refreshToken: tokens.refreshToken,
            });

            expectUnauthorizedResponse(response);
        });

        it('should reject invalid refresh token format', async () => {
            const response = await request(app).post('/api/v1/auth/refresh-token').send({
                refreshToken: 'invalid.token.format',
            });

            expectUnauthorizedResponse(response);
            expect(response.body.message).toContain('Invalid refresh token');
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        let testUser: TestUser;
        let tokens: AuthTokens;

        beforeEach(async () => {
            const setup = await setupUserAndTokens();
            testUser = setup.user;
            tokens = setup.tokens;
        });

        it('should logout and blacklist token', async () => {
            const response = await makeAuthRequest('post', '/api/v1/auth/logout', tokens.accessToken);

            expectSuccessResponse(response);
            expect(response.body.message).toBe('Logged out successfully');

            // Verify token is blacklisted
            const isBlacklisted = await TokenService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app).post('/api/v1/auth/logout');

            expectUnauthorizedResponse(response);
        });
    });

    describe('POST /api/v1/auth/revoke-all-tokens', () => {
        let testUser: TestUser;
        let tokens: AuthTokens;

        beforeEach(async () => {
            const setup = await setupUserAndTokens();
            testUser = setup.user;
            tokens = setup.tokens;
        });

        it('should revoke all user tokens', async () => {
            const response = await makeAuthRequest('post', '/api/v1/auth/revoke-all-tokens', tokens.accessToken);

            expectSuccessResponse(response);
            expect(response.body.message).toBe('All tokens revoked successfully');

            // Verify user tokens are revoked
            const areRevoked = await TokenService.isUserTokensRevoked(testUser._id.toString());
            expect(areRevoked).toBe(true);
        });

        it('should require authentication for token revocation', async () => {
            const response = await request(app).post('/api/v1/auth/revoke-all-tokens');

            expectUnauthorizedResponse(response);
        });
    });

    describe('Protected Routes', () => {
        let testUser: TestUser;
        let adminUser: TestUser;
        let userTokens: AuthTokens;
        let adminTokens: AuthTokens;

        beforeEach(async () => {
            const userSetup = await setupUserAndTokens();
            testUser = userSetup.user;
            userTokens = userSetup.tokens;

            const adminSetup = await setupUserAndTokens(true);
            adminUser = adminSetup.user;
            adminTokens = adminSetup.tokens;
        });

        it('should allow access with valid token', async () => {
            const response = await makeAuthRequest('get', '/api/v1/users/profile', userTokens.accessToken);

            expectSuccessResponse(response);
            expect(response.body.data._id).toBe(testUser._id.toString());
        });

        it('should deny access without token', async () => {
            const response = await request(app).get('/api/v1/users/profile');

            expectUnauthorizedResponse(response);
            expect(response.body.message).toContain('Not authorized');
        });

        it('should deny access with expired token', async () => {
            // Create an expired token using the helper function
            const expiredToken = generateExpiredToken();

            const response = await makeAuthRequest('get', '/api/v1/users/profile', expiredToken);

            expectUnauthorizedResponse(response);
        });

        it('should enforce admin role requirements', async () => {
            // Try to access admin route as regular user
            const response = await makeAuthRequest('get', '/api/v1/users', userTokens.accessToken);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Admin access required');
        });

        it('should allow admin access to admin routes', async () => {
            const response = await makeAuthRequest('get', '/api/v1/users', adminTokens.accessToken);

            expectSuccessResponse(response);
        });
    });
});
