const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  {
    ignores: ['coverage/**'],
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      'dist/**',
      'src/test/**',
      'src/test/**/*.test.ts',
      '**/*.spec.ts',
      '**/graphql.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
        ...globals.es6,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-debugger': 'warn',
    },
  },
];
