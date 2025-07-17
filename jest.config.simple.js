const base = require('./jest.config.base');

module.exports = {
    ...base,
    testMatch: ['**/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.simple.setup.ts'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    // Minimal mocks for integration tests
    automock: false,
    // Clear any existing mocks
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    resetModules: true,
};
