const base = require('./jest.config.base');

module.exports = {
    ...base,
    testMatch: ['**/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.integration.setup.ts'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    // Disable all mocks for integration tests
    automock: false,
    // Ensure no mocks are applied
    unmockedModulePathPatterns: [
        'node_modules/',
        'src/models/',
        'src/services/',
        'src/controllers/',
        'src/middleware/'
    ],
    // Clear any existing mocks for integration tests
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    resetModules: true,
};
