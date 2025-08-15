import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20000,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      provider: 'v8', // Más rápido que istanbul
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      clean: true,
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/types/**',
        'src/node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 30,  // Starting threshold for Phase 1
          functions: 30,
          lines: 30,
          statements: 30
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src')
    }
  }
})