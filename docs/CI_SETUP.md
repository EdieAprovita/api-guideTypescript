# CI/CD Pipeline Setup Guide

This document explains the CI/CD pipeline configuration and how to troubleshoot common issues, particularly with MongoDB Memory Server in CI environments.

## Overview

The CI/CD pipeline is configured to run on GitHub Actions and includes:

- **Quality Checks**: TypeScript compilation, linting, and formatting
- **Tests**: Unit and integration tests with MongoDB Memory Server
- **Build**: Application compilation
- **Security**: Dependency vulnerability scanning
- **Deploy**: Deployment placeholder (configure as needed)

## MongoDB Memory Server Configuration

### Problem

The main issue with CI failing was MongoDB Memory Server not starting properly in the CI environment. This is a common problem due to:

1. Missing system dependencies
2. Version compatibility issues
3. Resource constraints in CI
4. Network timeouts during binary download

### Solution

We've implemented a robust solution with multiple fallback options:

#### 1. System Dependencies

The CI workflow now installs all required system libraries:

```yaml
- name: Install system dependencies for MongoDB
  run: |
      sudo apt-get update
      sudo apt-get install -y \
          libcurl4 \
          openssl \
          libssl-dev \
          ca-certificates \
          curl \
          wget \
          gnupg \
          lsb-release
```

#### 2. Binary Caching

MongoDB binaries are cached to avoid re-downloading:

```yaml
- name: Cache mongodb-memory-server binaries
  uses: actions/cache@v3
  with:
      path: ~/.cache/mongodb-binaries
      key: mongodb-binaries-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      restore-keys: |
          mongodb-binaries-${{ runner.os }}-
```

#### 3. Environment Variables

Key environment variables for MongoDB Memory Server:

```bash
export MONGODB_MEMORY_SERVER_VERSION='6.0.0'
export MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT='60000'
export MONGODB_MEMORY_SERVER_DOWNLOAD_RETRY='3'
export MONGODB_MEMORY_SERVER_DOWNLOAD_DIR='~/.cache/mongodb-binaries'
```

#### 4. Fallback Configuration

The setup includes multiple fallback options:

1. **Primary**: MongoDB 6.0.0 with full configuration
2. **Fallback**: MongoDB 5.0.19 with minimal configuration
3. **Emergency**: Local MongoDB connection if available

## Test Configuration

### Integration Tests

Integration tests use a robust setup with:

- **Longer timeouts** for CI environments
- **Sequential execution** to avoid conflicts
- **Better error reporting** with JSON output
- **Retry mechanism** for flaky tests

```typescript
// vitest.integration.config.ts
testTimeout: process.env.CI ? 60000 : 30000,
hookTimeout: process.env.CI ? 90000 : 30000,
retry: process.env.CI ? 1 : 0,
```

### Database Connection

The database connection is configured with CI-specific optimizations:

```typescript
await mongoose.connect(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: process.env.CI ? 15000 : 5000,
    socketTimeoutMS: process.env.CI ? 15000 : 5000,
    connectTimeoutMS: process.env.CI ? 15000 : 5000,
    retryWrites: false,
    retryReads: false,
});
```

## Scripts

### setup-mongodb-memory.sh

This script handles MongoDB Memory Server setup with:

- System dependency verification
- Binary download testing
- Fallback version testing
- Environment variable configuration

### setup-ci-env.sh

Configures the CI environment with:

- Test environment variables
- MongoDB Memory Server settings
- Redis configuration
- JWT secrets for testing

## Troubleshooting

### Common Issues

#### 1. "Instance closed unexpectedly with code 1"

**Cause**: Missing system dependencies or version incompatibility

**Solution**:

- Ensure all system dependencies are installed
- Try fallback MongoDB version (5.0.19)
- Check available system resources

#### 2. "Download timeout"

**Cause**: Network issues or slow download

**Solution**:

- Increase `MONGODB_MEMORY_SERVER_DOWNLOAD_TIMEOUT`
- Use cached binaries
- Check network connectivity

#### 3. "Permission denied"

**Cause**: File system permissions

**Solution**:

- Ensure cache directory is writable
- Check user permissions in CI

### Debug Steps

1. **Check system dependencies**:

    ```bash
    ldconfig -p | grep libcurl
    ldconfig -p | grep libssl
    ```

2. **Test MongoDB Memory Server manually**:

    ```bash
    bash scripts/setup-mongodb-memory.sh
    ```

3. **Verify environment variables**:

    ```bash
    bash scripts/setup-ci-env.sh
    ```

4. **Run tests with verbose output**:
    ```bash
    npm run test:ci:verbose
    ```

## Performance Optimizations

### For CI

1. **Binary caching**: Reduces download time
2. **Sequential execution**: Prevents resource conflicts
3. **Optimized timeouts**: Balances reliability and speed
4. **Single connection pool**: Reduces resource usage

### For Local Development

1. **Faster timeouts**: Quick feedback during development
2. **Parallel execution**: Faster test runs
3. **Memory optimization**: Efficient resource usage

## Monitoring

### CI Metrics

Monitor these metrics in your CI runs:

- **Setup time**: How long MongoDB Memory Server takes to start
- **Test execution time**: Total test duration
- **Success rate**: Percentage of successful test runs
- **Resource usage**: Memory and CPU consumption

### Logs

Key log messages to watch for:

- `✅ MongoDB Memory Server created successfully`
- `✅ Test database connected`
- `✅ Test database disconnected`
- `❌ MongoDB Memory Server test failed`

## Future Improvements

1. **Docker-based testing**: Use Docker containers for more consistent environments
2. **Parallel test execution**: Run tests in parallel where possible
3. **Test result caching**: Cache test results for faster feedback
4. **Advanced monitoring**: Add detailed performance metrics

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review CI logs for specific error messages
3. Test locally with the same configuration
4. Consider using the fallback configurations

For persistent issues, consider:

- Updating to the latest mongodb-memory-server version
- Using a different MongoDB version
- Implementing Docker-based testing
- Adding more detailed logging and monitoring
