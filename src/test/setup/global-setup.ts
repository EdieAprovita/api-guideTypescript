import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { 
    setupMasterTestEnvironment, 
    setupAllMasterMocks,
    setupMasterDatabase,
    teardownMasterDatabase,
    clearMasterDatabase,
    generateMasterTestData
} from '../config/master-test-config';

// ============================================================================
// GLOBAL SETUP - USING MASTER CONFIGURATION
// ============================================================================

// Setup environment variables and mocks
setupMasterTestEnvironment();
setupAllMasterMocks();

// ============================================================================
// GLOBAL HOOKS
// ============================================================================

beforeAll(async () => {
    console.log('🔧 Setting up test environment...');

    // Setup database for integration tests
    if (process.env.TEST_TYPE === 'integration') {
        await setupMasterDatabase();
    }

    console.log('✅ Test environment ready');
});

afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');

    // Cleanup database
    if (process.env.TEST_TYPE === 'integration') {
        await teardownMasterDatabase();
    }

    console.log('✅ Test environment cleaned up');
});

beforeEach(async () => {
    // Clear database between tests for integration tests
    if (process.env.TEST_TYPE === 'integration') {
        await clearMasterDatabase();
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
    generateValidObjectId: () => '507f1f77bcf86cd799439011', // Consistent test ID
    createTestUser: generateMasterTestData.user,
    createAdminUser: () => generateMasterTestData.user({ role: 'admin', isAdmin: true }),
    createProfessionalUser: () => generateMasterTestData.user({ role: 'professional' }),
};

console.log('✅ Global test setup complete');