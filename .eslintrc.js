module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: "module",
		project: "./tsconfig.json",
	},
	plugins: ["@typescript-eslint", "prettier"],
	extends: [
		"eslint:recommended",
		"@typescript-eslint/recommended",
		"@typescript-eslint/recommended-requiring-type-checking",
		"prettier",
	],
	rules: {
		// TypeScript specific rules
		"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		"@typescript-eslint/explicit-function-return-type": "warn",
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/no-non-null-assertion": "error",
		"@typescript-eslint/prefer-nullish-coalescing": "error",
		"@typescript-eslint/prefer-optional-chain": "error",

		// General rules
		"no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
		"no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
		"prefer-const": "error",
		"no-var": "error",
		"object-shorthand": "error",
		"prefer-template": "error",

		// Prettier integration
		"prettier/prettier": "error",
	},
	env: {
		node: true,
		es6: true,
		jest: true,
	},
	ignorePatterns: ["dist/", "node_modules/", "*.js"],
};
