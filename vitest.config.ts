import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Environment
        environment: 'node',

        // Global setup and teardown (non-vitest imports only)
        globalSetup: ['./src/test/config/database-setup.ts'],
        globalTeardown: ['./src/test/config/database-setup.ts'],

        // Test files patterns
        include: ['src/test/**/*.test.ts', 'src/test/**/*.spec.ts'],

        // Exclude patterns
        exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/test/__mocks__/**',
            'src/test/templates/**',
            'src/test/fixtures/**',
        ],

        // Timeout settings
        testTimeout: 10000,
        hookTimeout: 10000,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'src/test/**',
                'src/types/**',
                'src/swagger.ts',
                'src/scripts/**',
                '**/*.d.ts',
                'coverage/**',
                'dist/**',
                '**/*.config.*',
                '**/index.ts',
            ],
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
                'src/controllers/**': {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
                'src/services/**': {
                    branches: 75,
                    functions: 75,
                    lines: 75,
                    statements: 75,
                },
                'src/middleware/**': {
                    branches: 75,
                    functions: 75,
                    lines: 75,
                    statements: 75,
                },
            },
        },

        // Reporters
        reporter: ['verbose', 'json'],

        // Setup files for different test types
        setupFiles: ['./src/test/setup/global-setup.ts'],

        // Parallel execution
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
                maxThreads: 4,
                minThreads: 1,
            },
        },

        // File watching
        watch: false,

        // Retry configuration
        retry: 1,

        // Mock configuration
        clearMocks: true,
        restoreMocks: true,

        // Globals
        globals: true,
    },

    // Resolve configuration
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@test': path.resolve(__dirname, 'src/test'),
            '@config': path.resolve(__dirname, 'src/test/config'),
            '@utils': path.resolve(__dirname, 'src/test/utils'),
            '@mocks': path.resolve(__dirname, 'src/test/__mocks__'),
        },
    },

    // Define configuration for different test types
    define: {
        'process.env.NODE_ENV': '"test"',
    },
});
