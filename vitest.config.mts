/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        // Environment
        environment: 'node',

        // Test files patterns - Focused on essential tests
        include: [
            'src/test/unit/**/*.test.ts',
            'src/test/services/**/*.test.ts',
            'src/test/controllers/**/*.test.ts',
            'src/test/middleware/**/*.test.ts',
            'src/test/routes/**/*.test.ts',
            'src/test/clients/**/*.test.ts',
        ],

        // Exclude problematic integration tests for now
        exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/test/__mocks__/**',
            'src/test/templates/**',
            'src/test/fixtures/**',
            // Integration tests run separately via test:ci:integration (they need
            // MongoMemoryServer which conflicts with unit-setup.ts global mocks)
            'src/test/integration/**',
            'src/test/setup/**',
            'src/test/config/**',
            'src/test/utils/**',
            'src/test/types/**',
            'src/test/e2e/**',
        ],

        // Optimized timeout settings
        testTimeout: 10000, // Reduced from 30000
        hookTimeout: 5000, // Reduced from 15000

        // Coverage configuration - Simplified
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: [
                'src/controllers/**/*.ts',
                'src/services/**/*.ts',
                'src/middleware/**/*.ts',
                'src/models/**/*.ts',
                'src/utils/**/*.ts',
                'src/config/**/*.ts',
            ],
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
                'src/server.ts',
                'src/app.ts',
            ],
            // Thresholds set to measured actuals minus 5pp (floor) — raise as coverage improves.
            // Order: branches/functions/lines/statements
            // Current actuals : 76% / 60% / 42% / 42%
            // Current floors  : 71  / 55  / 37  / 37  (actuals − 5pp, enforced below)
            // Sprint-13 target: 81% / 65% / 47% / 47%
            thresholds: {
                global: {
                    branches: 71,
                    functions: 55,
                    lines: 37,
                    statements: 37,
                },
            },
        },

        // Reporters - Simplified
        reporters: ['default'],

        // Setup files - Minimal
        setupFiles: ['./src/test/setup/unit-setup.ts'],

        // Parallel execution - Optimized
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: false, // Allow parallel execution
                isolate: true, // Better isolation
            },
        },
        maxConcurrency: 4, // Allow some parallel execution

        // File watching
        watch: false,

        // Retry configuration - Reduced
        retry: 0, // No retries to speed up failures

        // Mock configuration - Simplified
        clearMocks: true,
        restoreMocks: false, // Don't restore to avoid overhead
        mockReset: false, // Don't reset to avoid overhead

        // Globals
        globals: true,

        // TypeScript support
        // Use tsc directly for type checking: npm run type-check
    },

    // Resolve configuration
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@test': fileURLToPath(new URL('./src/test', import.meta.url)),
        },
    },

    // Define configuration
    define: {
        'process.env.NODE_ENV': '"test"',
    },

    // ESM handling
    esbuild: {
        target: 'node18',
    },

    // SSR configuration for Mongoose ESM compatibility
    ssr: {
        noExternal: ['mongoose', 'bcryptjs'],
    },
});
