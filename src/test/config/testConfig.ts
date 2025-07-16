/**
 * Test configuration that uses enhancedTestConfig to avoid duplication
 * This file provides backward compatibility while using the enhanced version
 */

import { enhancedTestConfig } from './enhancedTestConfig';

// Export the enhanced config as the main test config
export const testConfig = enhancedTestConfig;

// Backward compatibility exports
export const generateTestPassword = enhancedTestConfig.generators.securePassword;
export const generateWeakPassword = enhancedTestConfig.generators.weakPassword;
export const TEST_PASSWORDS = {
    strong: enhancedTestConfig.credentials.valid,
    weak: enhancedTestConfig.credentials.weak,
    alternative: enhancedTestConfig.credentials.fixture,
};
