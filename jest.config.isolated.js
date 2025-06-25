// Jest config para pruebas aisladas (middleware tests)
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/middleware/**/*.test.ts',
        '**/controllers/useControllers.test.ts'
    ],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
            },
        ],
    },
    collectCoverageFrom: [
        'src/middleware/**/*.ts',
        'src/controllers/userControllers.ts',
        'src/utils/validators.ts',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/types/**'
    ],
    coverageDirectory: 'coverage-isolated',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/test/setupIsolated.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
    resetMocks: false,
    resetModules: false,
    maxWorkers: 1,
    verbose: true,
    displayName: 'Isolated Tests (Real Middleware)',
};