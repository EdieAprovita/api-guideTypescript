/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Environment
        environment: 'node',

        // Test files patterns - More specific to avoid conflicts
        include: ['src/test/**/*.test.ts', 'src/test/**/*.spec.ts'],

        // Exclude patterns
        exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/test/__mocks__/**',
            'src/test/templates/**',
            'src/test/fixtures/**',
            'src/test/services/cacheAlertService.test.old',
            'src/test/services/cacheService.test.old',
            'src/test/services/userService.test.old',
        ],

        // Increased timeout settings for integration tests
        testTimeout: 30000,
        hookTimeout: 15000,

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
        reporters: ['verbose'],

        // Setup files for different test types
        setupFiles: ['./src/test/setup/global-setup.ts'],

        // Parallel execution - Sequential for DB tests
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true, // Sequential execution for DB consistency
                isolate: false, // Share context between tests to improve performance
            },
        },
        maxConcurrency: 1, // Run tests sequentially to avoid DB conflicts

        // File watching
        watch: false,

        // Retry configuration
        retry: 1,

        // Mock configuration
        clearMocks: true,
        restoreMocks: true,
        mockReset: true,

        // Globals
        globals: true,

        // TypeScript support
        typecheck: {
            enabled: true,
            tsconfig: './tsconfig.test.json',
        },
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

    // Ensure proper ESM handling
    esbuild: {
        target: 'node18',
    },

    // SSR configuration for Mongoose ESM compatibility
    ssr: {
        noExternal: ['mongoose', 'bcryptjs'],
    },

    // Alternative deps configuration for older Vitest versions
    // test: {
    //     deps: {
    //         inline: ['mongoose', 'bcryptjs'],
    //         interopDefault: true,
    //     }
    // }
});
