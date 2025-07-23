// INTEGRATION TEST SETUP - WITH CONTROLLED MOCKING
// This setup is specifically for integration tests with proper mock configuration

import mongoose from 'mongoose';

// Set test environment variables FIRST
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
// Avoid binary-download failures in CI
process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
process.env.BCRYPT_SALT_ROUNDS = '10';

// MongoDB configuration for tests
// Try to use local MongoDB if available, otherwise use memory server
if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
}

// Disable Redis for tests (TokenService will use in-memory mock)
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

// Email configuration for tests
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';
process.env.CLIENT_URL = 'http://localhost:3000';

// CRITICAL: Clear any existing mocks before setting up
jest.clearAllMocks();
jest.resetModules();

// IMPORTANT: Mock TokenService for integration tests to ensure consistency
jest.mock('../../services/TokenService', () => {
    const originalModule = jest.requireActual('../../services/TokenService');
    const jwt = require('jsonwebtoken');

    // Create a mock that extends the real TokenService but with controlled behavior
    const MockTokenService = {
        ...originalModule,
        generateTokens: jest.fn().mockImplementation((userId: string, email?: string, role?: string) => {
            // Generate real JWT tokens for integration tests
            const payload = { userId, email: email || 'test@example.com', role: role || 'user' };
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { 
                expiresIn: '15m',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            const refreshToken = jwt.sign({...payload, type: 'refresh'}, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret', { 
                expiresIn: '7d',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            
            return Promise.resolve({
                accessToken,
                refreshToken,
            });
        }),
        generateTokenPair: jest.fn().mockImplementation((payload: any) => {
            // Generate real JWT tokens for integration tests
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { 
                expiresIn: '15m',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            const refreshToken = jwt.sign({...payload, type: 'refresh'}, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret', { 
                expiresIn: '7d',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            
            return Promise.resolve({
                accessToken,
                refreshToken,
            });
        }),
        verifyAccessToken: jest.fn().mockImplementation((token: string) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
                return Promise.resolve(decoded);
            } catch (error) {
                return Promise.reject(error);
            }
        }),
        verifyRefreshToken: jest.fn().mockImplementation((token: string) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret');
                return Promise.resolve(decoded);
            } catch (error) {
                return Promise.reject(error);
            }
        }),
        refreshTokens: jest.fn().mockImplementation((refreshToken: string) => {
            try {
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret');
                // Generate new tokens
                const newPayload = { userId: decoded.userId, email: decoded.email, role: decoded.role };
                const accessToken = jwt.sign(newPayload, process.env.JWT_SECRET || 'test-secret', { 
                    expiresIn: '15m',
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client'
                });
                const newRefreshToken = jwt.sign({...newPayload, type: 'refresh'}, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret', { 
                    expiresIn: '7d',
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client'
                });
                
                return Promise.resolve({
                    accessToken,
                    refreshToken: newRefreshToken,
                });
            } catch (error) {
                return Promise.reject(error);
            }
        }),
        blacklistToken: jest.fn().mockImplementation(async (token: string) => {
            // Store blacklisted tokens in a Set for this test session
            if (!global.testBlacklistedTokens) {
                global.testBlacklistedTokens = new Set();
            }
            global.testBlacklistedTokens.add(token);
            return Promise.resolve();
        }),
        revokeAllUserTokens: jest.fn().mockImplementation(async (userId: string) => {
            if (!global.testRevokedUsers) {
                global.testRevokedUsers = new Set();
            }
            global.testRevokedUsers.add(userId);
            return Promise.resolve();
        }),
        isTokenBlacklisted: jest.fn().mockImplementation(async (token: string) => {
            return Promise.resolve(global.testBlacklistedTokens?.has(token) || false);
        }),
        isUserTokensRevoked: jest.fn().mockImplementation(async (userId: string) => {
            return Promise.resolve(global.testRevokedUsers?.has(userId) || false);
        }),
        clearAllForTesting: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
    };

    return MockTokenService;
});

// DISABLE AUTOMATIC MOCKING for other services in integration tests
jest.unmock('../../controllers/userControllers');
jest.unmock('../../services/UserService');
jest.unmock('../../middleware/authMiddleware');
jest.unmock('../../middleware/validation');
jest.unmock('../../middleware/security');
jest.unmock('../../middleware/errorHandler');
jest.unmock('../../middleware/asyncHandler');

// Important: Also unmock the __mocks__ files that might be applied automatically
jest.unmock('../__mocks__/authMiddleware');
jest.unmock('../__mocks__/validation');
jest.unmock('../__mocks__/middleware');

// Configure console for debugging
const originalConsoleLog = console.log;
console.log = (...args) => {
    if (process.env.TEST_DEBUG === 'true') {
        originalConsoleLog('[INTEGRATION TEST]', ...args);
    }
};

// Increase timeout for integration tests
jest.setTimeout(60000); // Increased to 60 seconds

console.log('Integration test setup complete - WITH CONTROLLED MOCKING');
console.log('MongoDB URI:', process.env.MONGODB_URI);
