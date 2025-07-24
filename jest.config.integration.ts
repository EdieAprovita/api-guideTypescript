import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/integration/**/*.test.ts', '**/integration/**/*.spec.ts'],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/test/**/*', '!src/**/__mocks__/**/*'],
    setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.simple.setup.ts'],
    testTimeout: 30000, // 30 seconds for integration operations
    maxWorkers: 1, // Run tests sequentially to avoid database conflicts
    forceExit: true, // Force exit after tests complete
    detectOpenHandles: true, // Detect open handles
    verbose: true,
    // Disable watchman to avoid permission issues
    watchman: false,
    // Use node crawler instead of watchman
    haste: {
        enableSymlinks: false,
    },
    // Global test configuration
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json',
        },
    },
    // Coverage configuration
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60,
        },
    },
    // Test path patterns
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
    // Module name mapping
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
    // Reset modules between tests
    resetModules: true,
    // Reset mocks between tests
    resetMocks: true,
    // Environment variables for integration tests
    setupFiles: ['<rootDir>/src/test/integration/jest.simple.setup.ts'],
    // Unmock specific modules for integration tests
    unmockedModulePathPatterns: [
        '<rootDir>/src/middleware/authMiddleware.ts',
        '<rootDir>/src/middleware/validation.ts',
        '<rootDir>/src/middleware/security.ts',
        '<rootDir>/src/controllers/',
        '<rootDir>/src/services/',
        '<rootDir>/src/models/',
    ],
};

export default config;
