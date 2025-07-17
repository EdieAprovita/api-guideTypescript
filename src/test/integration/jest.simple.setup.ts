import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';

// Create a set to track blacklisted tokens
const blacklistedTokens = new Set<string>();

// Mock TokenService using the same pattern as the main test setup
jest.mock('../../services/TokenService', () => ({
    __esModule: true,
    default: {
        generateTokenPair: jest.fn().mockResolvedValue({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
        }),
        verifyAccessToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.verifyAccessToken MOCK CALLED ===');
            console.log('Token received:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            
            // Decode the JWT token to get the real payload
            const jwt = require('jsonwebtoken');
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_12345', {
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client'
                });
                console.log('Mock decoded payload:', decoded);
                
                // Return the actual payload from the token
                return {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role || 'user'
                };
            } catch (error) {
                console.log('Mock decode error:', error.message);
                // Fallback to a valid payload if decoding fails
                return {
                    userId: faker.database.mongodbObjectId(),
                    email: 'test@example.com',
                    role: 'user'
                };
            }
        }),
        verifyRefreshToken: jest.fn().mockResolvedValue({
            userId: faker.database.mongodbObjectId(),
            email: 'test@example.com',
            role: 'user',
        }),
        refreshTokens: jest.fn().mockResolvedValue({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
        }),
        blacklistToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.blacklistToken MOCK CALLED ===');
            console.log('Blacklisting token:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            blacklistedTokens.add(token);
            return undefined;
        }),
        revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.isTokenBlacklisted MOCK CALLED ===');
            console.log('Checking if token is blacklisted:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            const isBlacklisted = blacklistedTokens.has(token);
            console.log('Token is blacklisted:', isBlacklisted);
            return isBlacklisted;
        }),
        isUserTokensRevoked: jest.fn().mockResolvedValue(false),
    },
}));

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

// Email configuration for tests
process.env.EMAIL_USER = faker.internet.email();
process.env.EMAIL_PASS = generateTestPassword();
process.env.CLIENT_URL = 'http://localhost:3000'

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clear blacklisted tokens before each test
beforeEach(() => {
    blacklistedTokens.clear();
});

console.log('Integration test setup complete');
