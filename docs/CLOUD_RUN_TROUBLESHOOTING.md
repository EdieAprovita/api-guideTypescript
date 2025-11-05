# Cloud Run Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Container Failed to Start Error

**Error Message:**

```
The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

**Root Causes:**

1. Missing environment variables (especially `MONGODB_URI`)
2. MongoDB connection blocking server startup
3. Server not listening on `0.0.0.0` (listening on `localhost` won't work)
4. Application crashes during initialization
5. Health check endpoint not responding

**Solutions Applied:**

#### A. Non-blocking MongoDB Connection

The application now starts the MongoDB connection asynchronously without blocking the HTTP server startup:

```typescript
// In app.ts
if (process.env.NODE_ENV !== 'test') {
    connectDB()
        .then(() => {
            isMongoConnected = true;
            console.log('✅ MongoDB connected successfully');
        })
        .catch(err => {
            isMongoConnected = false;
            mongoConnectionError = err;
            console.error('⚠️  Failed to connect to MongoDB on startup:', err.message);
            console.log('📌 Server will continue running without database connection');
        });
}
```

#### B. Always Listen on 0.0.0.0

```typescript
// In server.ts
const HOST = '0.0.0.0'; // REQUIRED for Cloud Run
```

#### C. Increased Timeouts

```typescript
// In db.ts
const options: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    connectTimeoutMS: 10000,
    // ... other options
};
```

### 2. Required Environment Variables for Cloud Run

Set these in Cloud Run service configuration:

```bash
# Required
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
NODE_ENV=production
PORT=8080  # Cloud Run sets this automatically, but can be overridden

# Optional but recommended
ENABLE_SWAGGER_UI=true  # To enable API docs in production
JWT_SECRET=your-secret-key
COOKIE_SECRET=your-cookie-secret
```

### 3. Cloud Run Configuration

#### Minimum Configuration:

```bash
gcloud run deploy api-guidetypescript \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --timeout=300 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="MONGODB_URI=your-mongodb-uri"
```

#### Recommended Configuration with Startup Probe:

```bash
gcloud run deploy api-guidetypescript \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --timeout=300 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --startup-cpu-boost \
  --execution-environment=gen2 \
  --cpu-throttling \
  --startup-probe-period=240 \
  --startup-probe-timeout=10 \
  --startup-probe-failure-threshold=3 \
  --startup-probe-initial-delay=10 \
  --set-env-vars="NODE_ENV=production,ENABLE_SWAGGER_UI=true" \
  --set-env-vars="MONGODB_URI=your-mongodb-uri"
```

### 4. Health Check Endpoints

The application provides three health check endpoints:

1. **Liveness Probe** - `/health`
    - Always returns 200 if the server is running
    - Used by Cloud Run to determine if container is alive

2. **Readiness Probe** - `/health/ready`
    - Returns 200 only if MongoDB is connected
    - Returns 503 if dependencies are not ready

3. **Deep Health Check** - `/health/deep`
    - Comprehensive health check with memory and service status
    - Useful for monitoring and debugging

### 5. Debugging Cloud Run Deployments

#### View Logs:

```bash
# Real-time logs
gcloud run services logs tail api-guidetypescript --region=europe-west1

# Logs from specific revision
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api-guidetypescript" \
  --limit=100 --format=json
```

#### Check Environment Variables:

```bash
gcloud run services describe api-guidetypescript \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

#### Test Container Locally:

```bash
# Build the image
docker build -t api-guidetypescript .

# Run with environment variables
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your-mongodb-uri" \
  -e PORT=8080 \
  api-guidetypescript

# Test health endpoint
curl http://localhost:8080/health
```

### 6. Common Configuration Mistakes

#### ❌ Wrong:

```typescript
// Listening on localhost (won't work in Cloud Run)
const HOST = 'localhost';
app.listen(PORT, HOST);
```

#### ✅ Correct:

```typescript
// Listening on all interfaces
const HOST = '0.0.0.0';
app.listen(PORT, HOST);
```

#### ❌ Wrong:

```typescript
// Blocking server startup on DB connection
await connectDB(); // This blocks!
const server = app.listen(PORT);
```

#### ✅ Correct:

```typescript
// Non-blocking DB connection
connectDB().catch(err => console.error(err));
const server = app.listen(PORT); // Server starts immediately
```

### 7. Startup Time Optimization

To reduce startup time and avoid timeout errors:

1. **Use Cloud Run Generation 2** with startup probes
2. **Enable Startup CPU Boost** for faster cold starts
3. **Keep minimum instances** at 1 to avoid cold starts
4. **Optimize Docker image**:
    - Use multi-stage builds ✅ (already implemented)
    - Minimize dependencies
    - Use Alpine base images ✅ (already implemented)

### 8. Memory and CPU Limits

Adjust based on your workload:

```bash
# For light traffic
--memory=512Mi --cpu=1

# For moderate traffic (recommended)
--memory=1Gi --cpu=2

# For high traffic
--memory=2Gi --cpu=4
```

### 9. MongoDB Atlas Configuration

Ensure MongoDB Atlas allows Cloud Run IP addresses:

1. Go to MongoDB Atlas → Network Access
2. Add IP Address: `0.0.0.0/0` (or specific Cloud Run IPs)
3. Verify connection string is correct
4. Use `retryWrites=true` in connection string

### 10. Monitoring and Alerts

Set up Cloud Monitoring alerts for:

- Container startup failures
- Health check failures
- High memory usage
- Request latency
- Error rates

## Quick Checklist

- [ ] Server listens on `0.0.0.0`, not `localhost`
- [ ] `PORT` environment variable is used (from `process.env.PORT`)
- [ ] MongoDB connection is non-blocking
- [ ] All required environment variables are set in Cloud Run
- [ ] MongoDB Atlas allows Cloud Run connections
- [ ] Health check endpoint (`/health`) returns 200
- [ ] Container starts within timeout (default: 4 minutes)
- [ ] Logs are visible in Cloud Logging
- [ ] Docker image builds successfully locally
- [ ] Container runs successfully with `docker run`

## Still Having Issues?

1. Check Cloud Run logs for specific error messages
2. Test Docker container locally with production environment variables
3. Verify MongoDB connection string is correct
4. Ensure Cloud Run has enough memory and CPU
5. Check if startup timeout needs to be increased
6. Review Cloud Run service configuration

## Support Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Troubleshooting](https://cloud.google.com/run/docs/troubleshooting)
- [MongoDB Atlas Network Access](https://docs.atlas.mongodb.com/security-whitelist/)
