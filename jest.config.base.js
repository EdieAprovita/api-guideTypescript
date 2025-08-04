module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
            },
        ],
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/types/**',
        '!src/controllers/**',
        '!src/services/**',
        '!src/routes/**',
        '!src/middleware/**',
        '!src/scripts/**',
        '!src/config/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    clearMocks: true,
    restoreMocks: true,
    resetMocks: false,
    resetModules: false,
    maxWorkers: 1,
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 20,
            lines: 20,
            statements: 20,
        },
    },
};
