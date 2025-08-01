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
        testTimeout: process.env.CI ? 60000 : 30000, // Longer timeout for CI
        hookTimeout: process.env.CI ? 90000 : 30000, // Much longer timeout for CI
        bail: 0, // Don't stop on first failure - run all tests to see status
        maxConcurrency: 1, // Run integration tests sequentially
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true, // Use single process for DB consistency
            },
        },
        // Better error reporting for CI
        reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
        outputFile: process.env.CI ? 'test-results/integration-results.json' : undefined,
        // Retry failed tests in CI
        retry: process.env.CI ? 1 : 0,
        // Better coverage for CI
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'src/test/', 'dist/', 'coverage/', '**/*.d.ts', '**/*.config.*', 'scripts/'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@test': path.resolve(__dirname, './src/test'),
        },
    },
});
