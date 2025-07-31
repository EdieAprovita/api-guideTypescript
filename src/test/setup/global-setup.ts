/**
 * Simplified Global Test Setup
 * Using the new unified configuration system
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTest } from '../config/unified-test-config';

// ============================================================================
// GLOBAL SETUP - MINIMAL AND CLEAN
// ============================================================================

// Setup hooks for different test types
const unitTestHooks = setupTest();
const integrationTestHooks = setupTest({ withDatabase: true });

// Determine which hooks to use based on test file or environment
const isIntegrationTest = process.env.TEST_TYPE === 'integration' || 
                         process.argv.some(arg => arg.includes('integration'));

const hooks = isIntegrationTest ? integrationTestHooks : unitTestHooks;

// ============================================================================
// GLOBAL HOOKS
// ============================================================================

beforeAll(async () => {
    console.log(`🔧 Setting up ${isIntegrationTest ? 'integration' : 'unit'} test environment...`);
    await hooks.beforeAll();
    console.log('✅ Test environment ready');
});

afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    await hooks.afterAll();
    console.log('✅ Test environment cleaned up');
});

beforeEach(async () => {
    await hooks.beforeEach();
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

console.log('✅ Global test setup complete');