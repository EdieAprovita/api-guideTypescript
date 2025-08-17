/**
 * Vitest Configuration for Integration Tests
 * Simplified configuration for integration tests
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        name: 'integration',
        include: ['src/test/integration/**/*.test.ts'],
        exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/test/__mocks__/**',
            'src/test/templates/**',
            'src/test/fixtures/**',
            'src/test/setup/**',
            'src/test/config/**',
            'src/test/utils/**',
            'src/test/types/**',
            'src/test/e2e/**',
            'src/test/unit/**',
            'src/test/services/**',
            'src/test/controllers/**',
            'src/test/middleware/**'
        ],
        environment: 'node',
        globals: true,
        clearMocks: true,
        setupFiles: ['src/test/setup/integration-setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        teardownTimeout: 30000,
        bail: 0,
        maxConcurrency: 1,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        reporters: ['default'],
        disableConsoleIntercept: true,
        retry: 0,
        dangerouslyIgnoreUnhandledErrors: false,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@test': fileURLToPath(new URL('./src/test', import.meta.url)),
        },
    },
    define: {
        'process.env.NODE_ENV': '"test"',
        'process.env.JWT_SECRET': '"test-jwt-secret-key-12345"',
        'process.env.JWT_REFRESH_SECRET': '"test-refresh-secret-key-12345"',
        'process.env.JWT_EXPIRES_IN': '"1h"',
        'process.env.JWT_REFRESH_EXPIRES_IN': '"7d"',
        'process.env.BCRYPT_SALT_ROUNDS': '"4"',
        'process.env.REDIS_HOST': '"127.0.0.1"',
        'process.env.REDIS_PORT': '"6379"',
        'process.env.REDIS_PASSWORD': '"test-redis-password"',
        'process.env.EMAIL_USER': '"test@example.com"',
        'process.env.EMAIL_PASS': '"test-email-password"',
        'process.env.CLIENT_URL': '"http://localhost:3000"',
    },
});
