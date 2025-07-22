// MOCK INTEGRATION TEST SETUP
// This setup is for integration tests that use complete mocks

// Set test environment variables FIRST
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
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';
process.env.CLIENT_URL = 'http://localhost:3000';

// CRITICAL: Clear any existing mocks before setting up
jest.clearAllMocks();
jest.resetModules();

// IMPORTANT: Use the service mocks from __mocks__/services.ts
jest.mock('../../services/TokenService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.tokenService;
});

jest.mock('../../services/UserService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.userService;
});

// Mock other services as needed
jest.mock('../../services/PostService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.postService;
});

jest.mock('../../services/BusinessService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.businessService;
});

jest.mock('../../services/DoctorService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.doctorService;
});

jest.mock('../../services/MarketsService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.marketsService;
});

jest.mock('../../services/RestaurantService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.restaurantService;
});

jest.mock('../../services/RecipesService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.recipesService;
});

jest.mock('../../services/SanctuaryService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.sanctuaryService;
});

jest.mock('../../services/ProfessionService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.professionService;
});

jest.mock('../../services/ProfessionProfileService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.professionProfileService;
});

jest.mock('../../services/ReviewService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.reviewService;
});

jest.mock('../../services/GeoService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.geoService;
});

// Mock external libraries
jest.mock('jsonwebtoken', () => {
    const { externalMocks } = require('../__mocks__/services');
    return externalMocks.jsonwebtoken;
});

jest.mock('bcryptjs', () => {
    const { externalMocks } = require('../__mocks__/services');
    return externalMocks.bcrypt;
});

// Configure console for debugging
const mockConsoleLog = console.log;
console.log = (...args) => {
    if (process.env.TEST_DEBUG === 'true') {
        mockConsoleLog('[MOCK INTEGRATION TEST]', ...args);
    }
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Setup test database connection if needed
beforeAll(async () => {
    console.log('=== MOCK INTEGRATION TEST SETUP STARTED ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('JWT Secret set:', !!process.env.JWT_SECRET);
    console.log('Redis disabled:', !process.env.REDIS_HOST);
    console.log('All services mocked:', true);
});

afterAll(async () => {
    console.log('=== MOCK INTEGRATION TEST CLEANUP ===');
    // Cleanup connections, etc.
});

console.log('Mock integration test setup complete - ALL SERVICES MOCKED');
