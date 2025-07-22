// Middleware test config without global mocks
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/middleware/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.integration.setup.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
            },
        ],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 30000,
    verbose: true,
    // Clear any existing mocks
    clearMocks: true,
    restoreMocks: false,
    resetMocks: false,
    resetModules: false,
    maxWorkers: 1,
};