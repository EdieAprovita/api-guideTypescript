// Global test setup - Centralized and optimized
import { jest } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { generateTestPassword } from './utils/passwordGenerator';
import { authMiddlewareMocks, validationMocks, securityMocks, userControllerMocks } from './__mocks__/middleware';
import { serviceMocks, modelMocks, externalMocks } from './__mocks__/services';
import { dbConfigMocks } from './__mocks__/database';

// Mock environment variables with faker-generated values
process.env.NODE_ENV = 'test'; // Cambiar a 'test' para mejor rendimiento
process.env.JWT_SECRET = generateTestPassword();
process.env.BCRYPT_SALT_ROUNDS = '10';

// === CRITICAL: Mocks must be defined BEFORE any imports that use them ===

// Mock database connection first - prevents connection attempts
jest.mock('../config/db', () => dbConfigMocks);

// Mock auth middleware - CRITICAL for authRoutes.ts
jest.mock('../middleware/authMiddleware', () => ({
    __esModule: true,
    ...authMiddlewareMocks,
}));

// Mock validation middleware
jest.mock('../middleware/validation', () => ({
    __esModule: true,
    ...validationMocks,
}));

// Mock security middleware
jest.mock('../middleware/security', () => ({
    __esModule: true,
    ...securityMocks,
}));

// Mock user controllers (used in authRoutes)
jest.mock('../controllers/userControllers', () => ({
    __esModule: true,
    ...userControllerMocks,
}));

// Mock TokenService to prevent Redis connection issues
jest.mock('../services/TokenService', () => ({
    __esModule: true,
    default: serviceMocks.tokenService,
}));

// Mock User model
jest.mock('../models/User', () => ({
    __esModule: true,
    User: modelMocks.User,
    default: modelMocks.User,
}));

// Mock external libraries
jest.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: jest.fn().mockReturnValue('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZW1haWwuY29tIn0.mock-signature'),
        verify: jest.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@email.com' }),
        decode: jest.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@email.com', exp: Math.floor(Date.now() / 1000) + 3600 }),
    },
    sign: jest.fn().mockReturnValue('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZW1haWwuY29tIn0.mock-signature'),
    verify: jest.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@email.com' }),
    decode: jest.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@email.com', exp: Math.floor(Date.now() / 1000) + 3600 }),
}));

jest.mock('bcryptjs', () => ({
    __esModule: true,
    ...externalMocks.bcrypt,
}));

// Mock logger to prevent file system operations
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Global test utilities - Suppress console output in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn, // Keep warnings visible
    error: console.error, // Keep errors visible
};

// Setup global test hooks
beforeEach(() => {
    // Only clear mock calls, not the mock implementations
    jest.clearAllMocks();
});

afterEach(() => {
    // Clean up any test-specific changes
    jest.restoreAllMocks();
});
