module.exports = {
    root: true,
    env: {
        node: true,
        jest: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        '@typescript-eslint/recommended-requiring-type-checking',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint'],
    rules: {
        // Add any custom rules here
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
    },
    overrides: [
        {
            // Configuration files don't need TypeScript parsing
            files: ['*.config.js', '*.config.ts', 'jest.config.js'],
            parser: 'espree',
            env: {
                node: true,
            },
            extends: ['eslint:recommended'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
            },
        },
        {
            // Test files have different rules
            files: ['src/test/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
            env: {
                jest: true,
            },
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
            },
        },
    ],
};
