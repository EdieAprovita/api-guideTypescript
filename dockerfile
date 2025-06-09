# Stage 1: Build
FROM node:24-alpine AS builder
# Install dumb-init for safe process handling
RUN apk add --no-cache dumb-init

# Create node user and group
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /src

# Copy manifests & install deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source & build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /src

# Copy built artifacts + deps
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/node_modules ./node_modules
COPY package*.json ./

# Run as non-root
USER nodejs

EXPOSE 5001
ENV NODE_ENV=production
ENV PORT=5001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]