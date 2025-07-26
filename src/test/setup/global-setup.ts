import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setupTestEnvironment, setupDatabase, teardownDatabase, clearDatabase } from '../config/database-setup';
import { setupAllMocks } from '../config/vitest-mocks';
import { generateValidObjectId, createTestUser, createAdminUser, createProfessionalUser } from '../config/test-utils';

// ============================================================================
// GLOBAL SETUP
// ============================================================================

// Setup environment variables and mocks
setupTestEnvironment();
setupAllMocks();

// ============================================================================
// GLOBAL HOOKS
// ============================================================================

beforeAll(async () => {
    console.log('🔧 Setting up test environment...');

    // Setup database for integration tests
    if (process.env.TEST_TYPE === 'integration') {
        await setupDatabase();
    }

    console.log('✅ Test environment ready');
});

afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');

    // Cleanup database
    if (process.env.TEST_TYPE === 'integration') {
        await teardownDatabase();
    }

    console.log('✅ Test environment cleaned up');
});

beforeEach(async () => {
    // Clear database between tests for integration tests
    if (process.env.TEST_TYPE === 'integration') {
        await clearDatabase();
    }
});

afterEach(() => {
    // Clear all mocks between tests
    vi.clearAllMocks();
});

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

// ============================================================================
// GLOBAL UTILITIES
// ============================================================================

// Make common testing utilities globally available
globalThis.testUtils = {
    generateValidObjectId,
    createTestUser,
    createAdminUser,
    createProfessionalUser,
};

console.log('✅ Global test setup complete');
