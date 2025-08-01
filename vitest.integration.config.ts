/**
 * Vitest Configuration for Integration Tests
 * Separate configuration for integration tests with real DB
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        name: 'integration',
        include: ['src/test/integration/**/*.test.ts', '**/*.integration.test.ts'],
        exclude: ['src/test/services/**/*.simple.test.ts', 'src/test/controllers/**/*.simple.test.ts'],
        environment: 'node',
        globals: true,
        clearMocks: true, // Clear mocks for integration tests to use real implementations
        setupFiles: ['src/test/setup/integration-setup.ts'],
        // Extended timeouts for CI with MongoDB Memory Server downloads and setup
        testTimeout: process.env.CI ? 120000 : 60000, // 2min for CI, 1min local
        hookTimeout: process.env.CI ? 300000 : 180000, // 5min for CI, 3min local
        teardownTimeout: process.env.CI ? 60000 : 30000, // Extended cleanup time
        bail: 0, // Don't stop on first failure - run all tests to see status
        maxConcurrency: 1, // Run integration tests sequentially for DB consistency
        isolate: true, // Isolate tests for better reliability
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true, // Use single process for DB consistency
                isolate: true,
            },
        },
        // Better error reporting and output
        reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
        outputFile: process.env.CI ? 'test-results/integration-results.json' : undefined,
        // Retry configuration for CI stability
        retry: process.env.CI ? 2 : 0, // Retry up to 2 times in CI
        // Enhanced coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                'dist/',
                'coverage/',
                '**/*.d.ts',
                '**/*.config.*',
                'scripts/',
                'src/swagger.ts',
                'src/types/',
            ],
            thresholds: {
                statements: process.env.CI ? 70 : 60,
                branches: process.env.CI ? 70 : 60,
                functions: process.env.CI ? 70 : 60,
                lines: process.env.CI ? 70 : 60,
            },
        },
        // Better handling of unhandled promises and errors
        dangerouslyIgnoreUnhandledErrors: false,
        logHeapUsage: process.env.CI,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@test': path.resolve(__dirname, './src/test'),
        },
    },
});
