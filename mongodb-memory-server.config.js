module.exports = {
  binary: {
    // Use stable MongoDB version in CI
    version: process.env.MONGODB_MEMORY_SERVER_VERSION || '5.0.19',
    // Use specific download directory for better caching
    downloadDir: process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || '~/.cache/mongodb-binaries',
    // Skip MD5 check to avoid corruption issues in CI
    checkMD5: false,
    // Increased timeouts for CI environments
    downloadTimeout: parseInt(process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT || '120000'),
    // Retry downloads up to 5 times
    downloadRetry: parseInt(process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY || '5'),
  },
  instance: {
    // Default database name for tests
    dbName: process.env.NODE_ENV === 'test' ? 'test-vegan-guide' : 'vegan-guide-test',
    // Let system choose free port
    port: undefined,
    // Use WiredTiger storage engine
    storageEngine: 'wiredTiger',
    // CI-optimized arguments
    args: process.env.CI ? ['--nojournal', '--noprealloc', '--smallfiles'] : [],
  },
  // Auto-start server when creating instance
  autoStart: true,
  // Use debug mode only in development
  debug: process.env.NODE_ENV === 'development' && !process.env.CI,
};