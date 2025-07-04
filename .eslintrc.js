module.exports = {
    root: true,
    env: {
        node: true,
        jest: true,
        es2021: true,
    },
    extends: ['eslint:recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    rules: {
        // Basic rules without requiring type checking
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-empty': ['error', { allowEmptyCatch: true }],
    },
    overrides: [
        {
            // All TypeScript files - simplified configuration
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
            },
        },
        {
            // Configuration files
            files: ['*.config.js', '*.config.ts', 'jest.config.js', '.eslintrc.js'],
            env: {
                node: true,
            },
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
                'no-console': 'off',
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
                'no-console': 'off',
            },
        },
    ],
    ignorePatterns: ['node_modules/', 'dist/', 'coverage/', '*.js', '!.eslintrc.js', '!jest.config.js'],
};
