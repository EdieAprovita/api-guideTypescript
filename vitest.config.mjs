import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/test/setup.ts'],
        testTimeout: 20000,
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', '.git', 'src/node_modules/**'],
        coverage: {
            provider: 'v8', // Más rápido que istanbul
            reporter: ['text', 'html', 'lcov', 'json'],
            reportsDirectory: './coverage',
            clean: true,
            include: ['src/**/*.ts'],
            exclude: ['src/test/**', 'src/**/*.d.ts', 'src/types/**', 'src/node_modules/**'],
            thresholds: {
                global: {
                    branches: 40,
                    functions: 40, 
                    lines: 40,
                    statements: 40,
                },
                // Specific thresholds for critical modules
                'src/controllers/**/*.ts': {
                    branches: 40,
                    functions: 40,
                    lines: 40,
                    statements: 40
                },
                'src/services/**/*.ts': {
                    branches: 35,
                    functions: 35,
                    lines: 35,
                    statements: 35
                },
                'src/middleware/**/*.ts': {
                    branches: 35,
                    functions: 35,
                    lines: 35,
                    statements: 35
                }
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
