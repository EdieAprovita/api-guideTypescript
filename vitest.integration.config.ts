/**
 * Vitest Configuration for Integration Tests
 * Separate configuration for integration tests with real DB
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    include: [
      'src/test/integration/**/*.test.ts',
      '**/*.integration.test.ts'
    ],
    exclude: [
      'src/test/services/**/*.simple.test.ts',
      'src/test/controllers/**/*.simple.test.ts'
    ],
    environment: 'node',
    globals: true,
    clearMocks: true, // Clear mocks for integration tests to use real implementations
    setupFiles: ['src/test/setup/integration-setup.ts'],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 30000,
    bail: 0, // Don't stop on first failure - run all tests to see status
    maxConcurrency: 1, // Run integration tests sequentially
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Use single process for DB consistency
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test')
    }
  }
});