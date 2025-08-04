/**
 * Test Logger Utility
 * Provides conditional logging for tests based on environment variables
 */

/**
 * Logs debug information only when DEBUG_TESTS environment variable is set
 */
export const testLog = (message: string, ...args: unknown[]): void => {
    if (process.env.DEBUG_TESTS) {
        console.log(`[TEST DEBUG] ${message}`, ...args);
    }
};

/**
 * Logs verbose integration test information only when DEBUG_INTEGRATION is set
 */
export const integrationLog = (message: string, ...args: unknown[]): void => {
    if (process.env.DEBUG_INTEGRATION || process.env.DEBUG_TESTS) {
        console.log(`[INTEGRATION] ${message}`, ...args);
    }
};

/**
 * Logs setup/teardown information only when DEBUG_SETUP is set
 */
export const setupLog = (message: string, ...args: unknown[]): void => {
    if (process.env.DEBUG_SETUP || process.env.DEBUG_TESTS) {
        console.log(`[SETUP] ${message}`, ...args);
    }
};

/**
 * Always logs errors, regardless of debug settings
 */
export const testError = (message: string, ...args: unknown[]): void => {
    console.error(`[TEST ERROR] ${message}`, ...args);
};

/**
 * Always logs warnings
 */
export const testWarn = (message: string, ...args: unknown[]): void => {
    console.warn(`[TEST WARN] ${message}`, ...args);
};