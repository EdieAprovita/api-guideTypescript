// INTEGRATION TEST SETUP - WITH CONTROLLED MOCKING
// This setup is specifically for integration tests with proper mock configuration

// Set test environment variables FIRST
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

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

    // Create a mock that extends the real TokenService but with controlled behavior
    const MockTokenService = {
        ...originalModule,
        generateTokens: jest.fn().mockImplementation((userId: string, email?: string, role?: string) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}`,
                refreshToken: `mock-refresh-token-${userId}`,
            });
        }),
        generateTokenPair: jest.fn().mockImplementation((payload: any) => {
            return Promise.resolve({
                accessToken: `mock-access-token-${payload.userId}`,
                refreshToken: `mock-refresh-token-${payload.userId}`,
            });
        }),
        verifyAccessToken: jest.fn().mockImplementation((token: string) => {
            const userId = token.replace('mock-access-token-', '');
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role: 'user',
            });
        }),
        verifyRefreshToken: jest.fn().mockImplementation((token: string) => {
            const userId = token.replace('mock-refresh-token-', '');
            return Promise.resolve({
                userId,
                email: 'test@example.com',
                role: 'user',
            });
        }),
        refreshTokens: jest.fn().mockImplementation((refreshToken: string) => {
            const userId = refreshToken.replace('mock-refresh-token-', '');
            return Promise.resolve({
                accessToken: `mock-access-token-${userId}-new`,
                refreshToken: `mock-refresh-token-${userId}-new`,
            });
        }),
        blacklistToken: jest.fn().mockResolvedValue(undefined),
        revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: jest.fn().mockResolvedValue(false),
        isUserTokensRevoked: jest.fn().mockResolvedValue(false),
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
jest.setTimeout(30000);

// Setup test database connection if needed
beforeAll(async () => {
    console.log('=== INTEGRATION TEST SETUP STARTED ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('JWT Secret set:', !!process.env.JWT_SECRET);
    console.log('Redis disabled:', !process.env.REDIS_HOST);
    console.log('TokenService mocked:', true);
});

afterAll(async () => {
    console.log('=== INTEGRATION TEST CLEANUP ===');
    // Cleanup connections, etc.
});

console.log('Integration test setup complete - WITH CONTROLLED MOCKING');
