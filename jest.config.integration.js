module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/integration/**/*.test.ts'],
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
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.integration.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 30000,
    clearMocks: false,       // Don't clear mocks for integration tests
    restoreMocks: false,     // Don't restore mocks for integration tests
    resetMocks: false,       // Don't reset mocks for integration tests  
    resetModules: false,     // Don't reset modules for integration tests
    maxWorkers: 1,           // Use single worker for database isolation
    verbose: true,           // Enable verbose for debugging
    forceExit: true,         // Force exit after tests complete
    detectOpenHandles: true, // Detect open handles for debugging
};
