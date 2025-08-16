/**
 * Vitest Configuration for Integration Tests
 * Separate configuration for integration tests with real DB
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        name: 'integration',
        include: ['src/test/integration/**/*.test.ts', '**/*.integration.test.ts'],
        exclude: ['src/test/services/**/*.simple.test.ts', 'src/test/controllers/**/*.simple.test.ts'],
        environment: 'node',
        globals: true,
        clearMocks: true, // Clear mocks for integration tests to use real implementations
        setupFiles: ['src/test/setup/integration-setup.ts'],
        // Simplified timeouts for reliable test execution
        testTimeout: 30000, // 30 seconds per test
        hookTimeout: 60000, // 1 minute for setup/teardown
        teardownTimeout: 30000, // 30 seconds for cleanup
        bail: 0, // Don't stop on first failure - run all tests to see status
        maxConcurrency: 1, // Run integration tests sequentially
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        // Better error reporting and output
        reporters: process.env.CI ? ['verbose', 'json'] : ['basic'],
        outputFile: process.env.CI ? 'test-results/integration-results.json' : undefined,
        // Disable console intercept to reduce noise
        disableConsoleIntercept: true,
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
        logHeapUsage: !!process.env.CI,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@test': fileURLToPath(new URL('./src/test', import.meta.url)),
        },
    },
    define: {
        'process.env.NODE_ENV': '"test"',
        'process.env.SILENT_TESTS': '"true"',
    },
});
