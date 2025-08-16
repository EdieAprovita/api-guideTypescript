/**
 * Vitest Configuration for Unit Tests
 * Separate configuration for fast unit tests with mocks
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
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
    testTimeout: 5000, // Fast timeout for unit tests
    hookTimeout: 5000,
    bail: 0,
    logHeapUsage: true,
    passWithNoTests: true,
    silent: false,
    reporters: ['basic'],
    outputFile: undefined,
    // Disable console intercept to reduce noise
    disableConsoleIntercept: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@test': fileURLToPath(new URL('./src/test', import.meta.url))
    }
  }
});