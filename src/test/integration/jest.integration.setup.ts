import { vi } from 'vitest';
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
vi.clearAllMocks();
jest.resetModules();

// IMPORTANT: Mock TokenService for integration tests to ensure consistency
vi.mock('../../services/TokenService', () => {
    const originalModule = jest.requireActual('../../services/TokenService');

    // Create a mock that extends the real TokenService but with controlled behavior
    const MockTokenService = {
        ...originalModule,
        generateTokens: vi.fn().mockImplementation((userId: string, email?: string, role?: string) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}-${role || 'user'}`,
                refreshToken: `mock-refresh-token-${userId}-${role || 'user'}`,
            });
        }),
        generateTokenPair: vi.fn().mockImplementation((payload: any) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${payload.userId}-${payload.role || 'user'}`,
                refreshToken: `mock-refresh-token-${payload.userId}-${payload.role || 'user'}`,
            });
        }),
        verifyAccessToken: vi.fn().mockImplementation((token: string) => {
            const parts = token.replace('mock-access-token-', '').split('-');
            const userId = parts[0];
            const role = parts[1] || 'user';
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role,
            });
        }),
        verifyRefreshToken: vi.fn().mockImplementation((token: string) => {
            const parts = token.replace('mock-refresh-token-', '').split('-');
            const userId = parts[0];
            const role = parts[1] || 'user';
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role,
            });
        }),
        refreshTokens: vi.fn().mockImplementation((refreshToken: string) => {
            const userId = refreshToken.replace('mock-refresh-token-', '');
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}-new`,
                refreshToken: `mock-refresh-token-${userId}-new`,
            });
        }),
        blacklistToken: vi.fn().mockResolvedValue(undefined),
        revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: vi.fn().mockResolvedValue(false),
        isUserTokensRevoked: vi.fn().mockResolvedValue(false),
        clearAllForTesting: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
    };

    return MockTokenService;
});

// DISABLE AUTOMATIC MOCKING for other services in integration tests
vi.unmock('../../controllers/userControllers');
vi.unmock('../../services/UserService');
vi.unmock('../../middleware/authMiddleware');
vi.unmock('../../middleware/validation');
vi.unmock('../../middleware/security');
vi.unmock('../../middleware/errorHandler');
vi.unmock('../../middleware/asyncHandler');

// Important: Also unmock the __mocks__ files that might be applied automatically
vi.unmock('../__mocks__/authMiddleware');
vi.unmock('../__mocks__/validation');
vi.unmock('../__mocks__/middleware');

// Configure console for debugging
const originalConsoleLog = console.log;
console.log = (...args) => {
    if (process.env.TEST_DEBUG === 'true') {
        originalConsoleLog('[INTEGRATION TEST]', ...args);
    }
};

// Increase timeout for integration tests
vi.setTimeout(60000); // Increased to 60 seconds

console.log('Integration test setup complete - WITH CONTROLLED MOCKING');
console.log('MongoDB URI:', process.env.MONGODB_URI);
