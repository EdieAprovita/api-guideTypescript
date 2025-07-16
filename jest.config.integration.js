// Integration test config without global mocks
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.simple.setup.ts'],
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
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    maxWorkers: 1,
    // Minimal mocks for integration tests - don't inherit global setup
    automock: false,
    // Clear any existing mocks
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    resetModules: true,
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 20,
            lines: 20,
            statements: 20,
        },
    },
};
