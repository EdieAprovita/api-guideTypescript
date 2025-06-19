// Global test setup
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'development'; // Changed to development to see real error messages
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Mock database connection - simple and effective
jest.mock('../config/db', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// Global test utilities
global.console = {
    ...console,
    // Suppress console.log in tests unless explicitly needed
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Setup global test hooks
beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});
