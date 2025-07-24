import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
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
vi.clearAllMocks();
vi.resetModules();

// IMPORTANT: Use the service mocks from __mocks__/services.ts
vi.mock('../../services/TokenService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.tokenService;
});

vi.mock('../../services/UserService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.userService;
});

// Mock other services as needed
vi.mock('../../services/PostService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.postService;
});

vi.mock('../../services/BusinessService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.businessService;
});

vi.mock('../../services/DoctorService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.doctorService;
});

vi.mock('../../services/MarketsService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.marketsService;
});

vi.mock('../../services/RestaurantService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.restaurantService;
});

vi.mock('../../services/RecipesService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.recipesService;
});

vi.mock('../../services/SanctuaryService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.sanctuaryService;
});

vi.mock('../../services/ProfessionService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.professionService;
});

vi.mock('../../services/ProfessionProfileService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.professionProfileService;
});

vi.mock('../../services/ReviewService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.reviewService;
});

vi.mock('../../services/GeoService', () => {
    const { serviceMocks } = require('../__mocks__/services');
    return serviceMocks.geoService;
});

// Mock external libraries
vi.mock('jsonwebtoken', () => {
    const { externalMocks } = require('../__mocks__/services');
    return externalMocks.jsonwebtoken;
});

vi.mock('bcryptjs', () => {
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
vi.setTimeout(30000);

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
