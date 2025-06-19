module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
            },
        ],
    },
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/test/**', '!src/types/**'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    // Add module name mapping for better import resolution
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // Increase test timeout for async operations
    testTimeout: 10000,
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
};
