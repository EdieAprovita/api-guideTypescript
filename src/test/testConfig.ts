import { faker } from '@faker-js/faker';

/**
 * Centralized test configuration to avoid hardcoded values
 * All values are generated dynamically for security
 */

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

// Dynamic password generation for tests
export const generateTestPassword = (): string => {
    return process.env.TEST_USER_PASSWORD || faker.internet.password({ 
        length: 12, 
        pattern: /[A-Za-z0-9!@#$%^&*]/ 
    });
};

export const generateWeakPassword = (): string => {
    return faker.string.alphanumeric(3);
};

// Common test values
export const TEST_VALUES = {
    sessionId: TEST_SESSION_ID,
    userEmail: `test-${TEST_SESSION_ID}@example.com`,
    username: `testuser-${TEST_SESSION_ID}`,
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
        'REDIS_DB'
    ];
    
    testVars.forEach(varName => {
        delete process.env[varName];
    });
};

// Export for backward compatibility
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
}; 