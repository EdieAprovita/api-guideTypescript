const base = require('./jest.config.base');

module.exports = {
  ...base,
  testMatch: [
    '**/test/integration/**/*.test.ts',
    '!**/test/unit/**',
    '!**/test/services/**',
    '!**/test/middleware/**',
    '!**/test/controllers/**'
  ],
  setupFiles: ['<rootDir>/src/test/integration/jest.integration.setup.ts'],
  setupFilesAfterEnv: [],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  // Para tests de integración, damos más tiempo
  testTimeout: 30000
};