# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and TypeScript config
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies and update npm to latest
RUN npm update -g npm && \
    npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/swagger.yaml ./

# Copy healthcheck script
COPY healthcheck.cjs ./

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run will override PORT env var)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=8080

# Health check - optimized for Cloud Run startup
# Cloud Run ignores HEALTHCHECK, but useful for local testing
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node healthcheck.cjs

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]