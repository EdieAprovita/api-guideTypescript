const base = require('./jest.config.base');

module.exports = {
    ...base,
    testMatch: [
        '**/middleware/**/*.test.ts',
        '**/controllers/userControllers.test.ts',
    ],
    collectCoverageFrom: [
        'src/middleware/**/*.ts',
        'src/controllers/userControllers.ts',
        'src/utils/validators.ts',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/types/**',
    ],
    coverageDirectory: 'coverage-isolated',
    setupFilesAfterEnv: ['<rootDir>/src/test/setupIsolated.ts'],
    testTimeout: 20000,
    verbose: true,
    displayName: 'Isolated Tests (Real Middleware)',
};
