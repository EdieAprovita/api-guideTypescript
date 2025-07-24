import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',
        
        // Test files patterns
        include: [
            'src/**/*.{test,spec}.{js,ts}',
            'src/test/**/*.test.ts',
            'src/test/**/*.spec.ts'
        ],
        
        // Exclude patterns
        exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/test/e2e/**', // Keep e2e tests separate with Playwright
        ],
        
        // Test timeout
        testTimeout: 30000, // 30 seconds for integration tests
        hookTimeout: 30000,
        
        // Global setup and teardown
        globalSetup: ['src/test/utils/globalSetup.ts'],
        setupFiles: [
            // Use different setups based on test type
            process.env.TEST_TYPE === 'integration' 
                ? 'src/test/setup/integrationSetup.ts'
                : 'src/test/setup/vitestSetup.ts'
        ],
        
        // Coverage configuration using v8
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: 'coverage',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.d.ts',
                'src/test/**',
                'src/types/**',
                'src/**/__mocks__/**',
                'src/scripts/**'
            ],
            thresholds: {
                branches: 60,
                functions: 60,
                lines: 60,
                statements: 60
            }
        },
        
        // Pool options for test execution
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: true, // Run sequentially to avoid DB conflicts
                isolate: true
            }
        },
        
        // Hook sequence (mimic Jest behavior)
        sequence: {
            hooks: 'list' // Run hooks sequentially like Jest
        },
        
        // File watching is handled automatically by Vitest
        
        // Reporter configuration
        reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
        outputFile: process.env.CI ? 'coverage/test-results.json' : undefined,
        
        // Globals - enables Jest-like globals (describe, it, expect, vi)
        globals: true,
        
        // Mock behavior (different from Jest)
        clearMocks: true,
        mockReset: false, // Vitest mockReset behaves differently than Jest
        restoreMocks: true,
        
        // Environment variables
        env: {
            NODE_ENV: 'test',
            JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
            JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing-purposes-only',
            JWT_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
            MONGODB_URI: 'mongodb://127.0.0.1:27017/test-db',
            REDIS_HOST: 'localhost',
            REDIS_PORT: '6379',
            REDIS_PASSWORD: '',
            PORT: '5001',
            API_VERSION: 'v1'
        }
    },
    
    // Path aliases (similar to Jest moduleNameMapper)
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@test': path.resolve(__dirname, './src/test')
        }
    },
    
    // Define different configurations for different test types
    // This replaces multiple Jest configs
    define: {
        __TEST_TYPE__: JSON.stringify(process.env.TEST_TYPE || 'unit')
    }
});