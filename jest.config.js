const base = require('./jest.config.base');

module.exports = {
    ...base,
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/test/controllers/userControllers.test.ts',
        '<rootDir>/src/test/e2e/',
        '<rootDir>/src/test/middleware/',
    ],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    testTimeout: 20000,
    verbose: false,
};
