# Cloud Run Deployment - Quick Start Guide

## 🚨 Critical Fix for Container Startup Timeout

This guide addresses the common error:

```
The user-provided container failed to start and listen on the port defined by the PORT=8080 environment variable within the allocated timeout.
```

## ✅ Changes Applied

### 1. Server Configuration (`src/server.ts`)

- ✅ Server now listens on `0.0.0.0` (required for Cloud Run)
- ✅ Default port is 8080 (Cloud Run standard)
- ✅ Enhanced startup logging

### 2. Database Connection (`src/app.ts`)

- ✅ MongoDB connection is **non-blocking**
- ✅ Server starts immediately, DB connects in background
- ✅ Application remains available even if DB connection fails

### 3. Docker Configuration (`Dockerfile`)

- ✅ Optimized health check timeouts
- ✅ Multi-stage build for smaller images
- ✅ Proper signal handling with dumb-init

## 🚀 Deployment Steps

### Option 1: Automated Deployment (Recommended)

```bash
# 1. Run pre-flight checks
./scripts/verify-cloud-run-config.sh

# 2. Deploy to Cloud Run
./scripts/deploy-cloud-run.sh
```

### Option 2: Manual Deployment

```bash
# 1. Verify configuration
./scripts/verify-cloud-run-config.sh

# 2. Set environment variables in Cloud Run
gcloud run services update api-guidetypescript \
  --region=europe-west1 \
  --update-env-vars="NODE_ENV=production,MONGODB_URI=your-mongodb-uri"

# 3. Commit and push changes
git add .
git commit -m "fix: Cloud Run deployment fixes"
git push origin development

# 4. Monitor deployment
# Cloud Build will trigger automatically
```

## 📋 Required Environment Variables

Set these in Cloud Run service configuration:

```bash
# Required
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
NODE_ENV=production

# Optional
ENABLE_SWAGGER_UI=true
JWT_SECRET=your-secret
COOKIE_SECRET=your-secret
```

## 🧪 Testing Locally

```bash
# Build Docker image
docker build -t api-guidetypescript .

# Run with environment variables
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your-mongodb-uri" \
  -e PORT=8080 \
  api-guidetypescript

# Test health endpoint
curl http://localhost:8080/health

# Test API
curl http://localhost:8080/api/v1
```

## 🔍 Monitoring Deployment

### Cloud Build Console

https://console.cloud.google.com/cloud-build?project=vegan-vita-402514

### Cloud Run Logs

https://console.cloud.google.com/run/detail/europe-west1/api-guidetypescript/logs?project=vegan-vita-402514

### Check Service Status

```bash
gcloud run services describe api-guidetypescript \
  --region=europe-west1 \
  --format=yaml
```

## ✅ Post-Deployment Verification

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe api-guidetypescript \
  --region=europe-west1 \
  --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/health

# Test readiness probe
curl $SERVICE_URL/health/ready

# Test API
curl $SERVICE_URL/api/v1

# Test with verbose output
curl -v $SERVICE_URL/health
```

## 🐛 Troubleshooting

### 1. Container Still Failing to Start

Check logs:

```bash
gcloud run services logs tail api-guidetypescript \
  --region=europe-west1
```

### 2. MongoDB Connection Issues

Verify:

- MongoDB Atlas network access allows Cloud Run IPs (`0.0.0.0/0`)
- MONGODB_URI is correctly set in Cloud Run
- Connection string includes `retryWrites=true`

### 3. Environment Variables Not Set

Update variables:

```bash
gcloud run services update api-guidetypescript \
  --region=europe-west1 \
  --update-env-vars="MONGODB_URI=your-uri,NODE_ENV=production"
```

### 4. Health Check Failing

Test health endpoint locally:

```bash
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your-uri" \
  api-guidetypescript

# In another terminal
curl http://localhost:8080/health
```

## 📊 Health Check Endpoints

| Endpoint        | Purpose         | Success Criteria      |
| --------------- | --------------- | --------------------- |
| `/health`       | Liveness probe  | Server is running     |
| `/health/ready` | Readiness probe | Server + DB connected |
| `/health/deep`  | Detailed health | Full system status    |

## 🔒 Security Checklist

- [ ] Environment variables are set in Cloud Run (not in code)
- [ ] MongoDB Atlas network access is configured
- [ ] Service account has minimal required permissions
- [ ] HTTPS is enforced
- [ ] Authentication is enabled for API endpoints

## 📚 Additional Resources

- [Cloud Run Troubleshooting Guide](./CLOUD_RUN_TROUBLESHOOTING.md)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Dockerfile Best Practices](../DOCKER-SECURITY.md)

## 🆘 Need Help?

1. Review error logs in Cloud Run console
2. Check [CLOUD_RUN_TROUBLESHOOTING.md](./CLOUD_RUN_TROUBLESHOOTING.md)
3. Verify all environment variables are set
4. Test Docker container locally
5. Check MongoDB Atlas network access

## 📝 Notes

- Cloud Run automatically scales to zero when not in use
- Cold start time is approximately 3-5 seconds
- Maximum timeout for startup is 240 seconds
- Memory limit is 512Mi-2Gi (configurable)
- CPU is allocated during request processing only
