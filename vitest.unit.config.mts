/**
 * Vitest Configuration for Unit Tests
 * Separate configuration for fast unit tests with mocks
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // CI-specific optimizations
  optimizeDeps: {
    // Force pre-bundling of problematic dependencies
    force: true,
    include: ['vitest', '@vitest/runner']
  },
  test: {
    name: 'unit',
    include: [
      'src/test/services/**/*.simple.test.ts',
      'src/test/controllers/**/*.simple.test.ts',
      'src/test/utils/**/*.test.ts',
      'src/test/models/**/*.test.ts'
    ],
    exclude: [
      'src/test/integration/**',
      '**/*.integration.test.ts'
    ],
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    setupFiles: ['src/test/setup/unit-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/controllers/**', 'src/utils/**'],
      exclude: [
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts'
      ]
    },
    testTimeout: 10000, // Increased timeout for CI
    hookTimeout: 10000,
    bail: 0,
    logHeapUsage: true,
    passWithNoTests: true,
    silent: false,
    reporters: ['basic'],
    outputFile: undefined,
    // Disable console intercept to reduce noise
    disableConsoleIntercept: true,
    // CI-specific settings
    pool: 'forks', // Use forks instead of threads for better CI compatibility
    poolOptions: {
      forks: {
        singleFork: true // Use single fork to avoid resource issues
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@test': fileURLToPath(new URL('./src/test', import.meta.url))
    }
  }
});