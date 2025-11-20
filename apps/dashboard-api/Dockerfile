# Multi-stage build for Node.js API
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install all dependencies (including devDependencies for build)
# Skip scripts (Husky) during Docker build
RUN npm ci --ignore-scripts

# Copy shared package source and build it
COPY packages/shared ./packages/shared
RUN npm run build:shared

# Copy API source code
COPY apps/api ./apps/api

# Build the API
WORKDIR /app/apps/api
RUN npm run build

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install only production dependencies
# Skip scripts (Husky) and ignore engines (Node version warnings)
RUN npm ci --omit=dev --ignore-scripts --workspace=packages/shared --workspace=apps/api

# Copy built shared package from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Copy built API from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/apps/api

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
