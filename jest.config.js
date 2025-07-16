const base = require('./jest.config.base');

module.exports = {
    ...base,
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/test/middleware/',
        '<rootDir>/src/test/controllers/userControllers.test.ts',

    ],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    testTimeout: 20000,
    verbose: false,
};
