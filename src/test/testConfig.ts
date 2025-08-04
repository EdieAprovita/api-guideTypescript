/**
 * Legacy Test Config Compatibility Layer
 * This file provides backward compatibility for existing test files
 * that import '../testConfig'. Redirects to the new unified config.
 */

export { setupTest, TEST_CONSTANTS, mockFactory } from './config/unified-test-config';
export type { TestContext, TestSetupOptions, TestHooks } from './config/unified-test-config';

// Import password generators
import { generateTestPassword, generateWeakPassword } from './utils/passwordGenerator';
import { generateSecureTestPassword } from './config/securityTestHelpers';

// Legacy compatibility object with all the functions that existing tests expect
const testConfig = {
    // Password generators
    generateTestPassword,
    generateWeakPassword,

    // Generators object for nested access
    generators: {
        securePassword: generateSecureTestPassword,
        weakPassword: generateWeakPassword,
        strongPassword: generateTestPassword,
    },

    // Test data generators
    createUser: (overrides = {}) => ({
        username: 'testuser',
        email: 'test@example.com',
        password: generateTestPassword(),
        role: 'user',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        ...overrides,
    }),

    createAdminUser: (overrides = {}) => ({
        username: 'admin',
        email: 'admin@example.com',
        password: generateTestPassword(),
        role: 'admin',
        isAdmin: true,
        isActive: true,
        isDeleted: false,
        ...overrides,
    }),

    // Authentication helpers
    auth: {
        validToken: 'valid-test-token-123',
        expiredToken: 'expired-test-token-123',
        invalidToken: 'invalid-test-token-123',
    },
};

export default testConfig;
