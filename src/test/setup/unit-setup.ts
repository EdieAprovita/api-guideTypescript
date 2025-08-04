/**
 * Unit Test Setup
 * Configuration for fast unit tests with mocks only
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';

// Global test setup
beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
});

// Mock console methods to reduce noise in tests
if (process.env.CI || process.env.SILENT_TESTS) {
    global.console = {
        ...console,
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

// Extend expect with custom matchers if needed
expect.extend({
    toBeValidMongoId(received: string) {
        const isValid = /^[0-9a-fA-F]{24}$/.test(received);
        return {
            message: () => `expected ${received} to be a valid MongoDB ObjectId`,
            pass: isValid,
        };
    },
});
