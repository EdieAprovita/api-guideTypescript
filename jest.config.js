module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/test/middleware/', // Excluir middleware tests - usar config aislado
        '<rootDir>/src/test/controllers/useControllers.test.ts', // Excluir useControllers - usar config aislado
    ],
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
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
    resetMocks: false,      // Cambiar a false para evitar conflictos con mocks globales
    resetModules: false,    // Cambiar a false para mantener mocks globales
    // Configuración adicional para manejar mocks de manera más estable
    maxWorkers: 1,          // Usar un solo worker para evitar problemas de concurrencia
    verbose: false,         // Reducir verbosidad a menos que sea necesario para debugging
};
