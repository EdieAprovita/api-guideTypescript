/**
 * Centralized test configuration to avoid hardcoded values
 * All values are generated dynamically for security
 * Now uses centralized password generator to eliminate duplication
 */

import { faker } from '@faker-js/faker';
import { generateTestPassword, generateWeakPassword } from './utils/passwordGenerator';
import { ERROR_MESSAGES } from './constants/validationMessages';

// Generate unique test session ID to avoid conflicts
const TEST_SESSION_ID = faker.string.alphanumeric(8);

// Dynamic Redis configuration for tests
export const TEST_REDIS_CONFIG = {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    password: process.env.TEST_REDIS_PASSWORD || faker.string.alphanumeric(32),
    database: parseInt(process.env.TEST_REDIS_DB || '1'), // Use different DB for tests
};

// Dynamic JWT configuration for tests
export const TEST_JWT_CONFIG = {
    accessSecret: process.env.TEST_JWT_SECRET || faker.string.alphanumeric(64),
    refreshSecret: process.env.TEST_JWT_REFRESH_SECRET || faker.string.alphanumeric(64),
    accessExpiry: process.env.TEST_JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.TEST_JWT_REFRESH_EXPIRY || '7d',
    issuer: 'vegan-guide-api-test',
    audience: 'vegan-guide-client-test',
};

// Dynamic test data generators
export const generateTestPhone = (): string => {
    return faker.phone.number();
};

export const generateTestEmail = (): string => {
    return faker.internet.email();
};

export const generateTestUsername = (): string => {
    return faker.internet.userName();
};

export const generateTestMongoId = (): string => {
    return faker.database.mongodbObjectId();
};

// Common test values
export const TEST_VALUES = {
    sessionId: TEST_SESSION_ID,
    userEmail: `test-${TEST_SESSION_ID}@example.com`,
    username: `${faker.internet.userName()}`,
    mockUserId: `user-${TEST_SESSION_ID}`,
    mockTokenId: `token-${TEST_SESSION_ID}`,
};

// Environment setup for tests
export const setupTestEnvironment = () => {
    // Set test environment variables dynamically
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = TEST_JWT_CONFIG.accessSecret;
    process.env.JWT_REFRESH_SECRET = TEST_JWT_CONFIG.refreshSecret;
    process.env.JWT_EXPIRES_IN = TEST_JWT_CONFIG.accessExpiry;
    process.env.JWT_REFRESH_EXPIRES_IN = TEST_JWT_CONFIG.refreshExpiry;
    process.env.REDIS_HOST = TEST_REDIS_CONFIG.host;
    process.env.REDIS_PORT = TEST_REDIS_CONFIG.port.toString();
    process.env.REDIS_PASSWORD = TEST_REDIS_CONFIG.password;
    process.env.REDIS_DB = TEST_REDIS_CONFIG.database.toString();
};

// Cleanup test environment
export const cleanupTestEnvironment = () => {
    const testVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_EXPIRES_IN',
        'JWT_REFRESH_EXPIRES_IN',
        'REDIS_HOST',
        'REDIS_PORT',
        'REDIS_PASSWORD',
        'REDIS_DB',
    ];

    testVars.forEach(varName => {
        delete process.env[varName];
    });
};

// Export for backward compatibility - now using centralized generator
export const TEST_PASSWORDS = {
    strong: generateTestPassword(),
    weak: generateWeakPassword(),
    alternative: generateTestPassword(),
};

export default {
    REDIS: TEST_REDIS_CONFIG,
    JWT: TEST_JWT_CONFIG,
    VALUES: TEST_VALUES,
    PASSWORDS: TEST_PASSWORDS,
    setupTestEnvironment,
    cleanupTestEnvironment,
    generateTestPassword,
    generateWeakPassword,
    generateTestPhone,
    generateTestEmail,
    generateTestUsername,
    generateTestMongoId,
    generators: {
        securePassword: generateTestPassword,
        phoneNumber: generateTestPhone,
        email: generateTestEmail,
        username: generateTestUsername,
        mongoId: generateTestMongoId,
    },
    passwords: {
        validPassword: generateTestPassword(),
        weakPassword: generateWeakPassword(),
        wrongPassword: generateTestPassword(),
        fixturePassword: generateTestPassword(),
    },
    messages: {
        validation: ERROR_MESSAGES.VALIDATION,
        auth: ERROR_MESSAGES.AUTH,
        general: ERROR_MESSAGES.GENERAL,
    },
};