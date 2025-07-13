const base = require('./jest.config.base');

module.exports = {
    ...base,
    testMatch: ['**/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.integration.setup.ts'],
    testTimeout: 30000,
    clearMocks: false,
    restoreMocks: false,
    resetMocks: false,
    resetModules: false,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
};
