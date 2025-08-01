# CI/CD Setup and Troubleshooting Guide

## Overview

This document explains the CI/CD pipeline configuration and how to troubleshoot common issues.

## Pipeline Structure

### Jobs

1. **Quality Checks** - Linting, type checking, format validation
2. **Tests** - Unit and integration tests with MongoDB and Redis
3. **Build** - Application build and artifact creation
4. **Security** - Security audit (main branch only)
5. **Deploy** - Deployment (main branch only)

## Services Configuration

### MongoDB

- **Image**: `mongo:6.0`
- **Port**: `27017`
- **Health Check**: `mongosh --eval 'db.runCommand({ping: 1})'`

### Redis

- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Health Check**: `redis-cli ping`

## Environment Variables

### Test Environment

```bash
NODE_ENV=test
CI=true
INTEGRATION_TEST=true
MONGODB_URI=mongodb://localhost:27017/vegan-city-guide-test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-jwt-secret-key-for-github-actions-very-long-and-secure-key
JWT_REFRESH_SECRET=test-refresh-secret-key-for-github-actions-very-long-and-secure-key
BCRYPT_SALT_ROUNDS=4
DISABLE_RATE_LIMIT=true
```

## Common Issues and Solutions

### 1. Redis Connection Error

**Error**: `Redis connection error: getaddrinfo EAI_AGAIN mock-redis-host`

**Solution**:

- Ensure `REDIS_HOST` is set to `localhost` in CI environment
- Check that Redis service is running and healthy
- Verify Redis port configuration

### 2. MongoDB In-Memory Server Library Error

**Error**: `libcrypto.so.1.1` missing

**Solution**:

- Added compatibility layer in workflow
- Installs `libssl1.1` or creates symlinks
- Uses real MongoDB in CI instead of in-memory server

### 3. Test Database Connection Issues

**Error**: Database connection timeout

**Solution**:

- Check MongoDB service health
- Verify connection string format
- Ensure proper environment variables

## Scripts

### `scripts/setup-ci-env.sh`

Sets up environment variables for CI testing.

### `scripts/setup-ci-db.sh`

Attempts to start MongoDB if not running (fallback).

## Running Tests Locally

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### All Tests (CI Style)

```bash
npm run test:ci
```

## Debugging

### Enable Debug Logs

```bash
DEBUG=* npm run test:integration
```

### Check Service Status

```bash
# MongoDB
mongosh --eval 'db.runCommand({ping: 1})'

# Redis
redis-cli ping
```

### Manual Service Start

```bash
# MongoDB
mongod --dbpath /tmp/mongodb-data --port 27017

# Redis
redis-server --port 6379
```

## Best Practices

1. **Always use CI environment variables** in tests
2. **Check service health** before running tests
3. **Use proper error handling** in test setup
4. **Keep test data isolated** from production
5. **Monitor test performance** and optimize as needed

## Troubleshooting Checklist

- [ ] Services are running and healthy
- [ ] Environment variables are correctly set
- [ ] Network connectivity is available
- [ ] Dependencies are installed
- [ ] Test database is accessible
- [ ] Redis connection is working
- [ ] JWT secrets are configured
- [ ] Rate limiting is disabled for tests
