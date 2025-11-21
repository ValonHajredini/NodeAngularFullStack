# Multi-stage build for Angular app
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies (including devDependencies for build)
# Skip scripts (Husky) during Docker build
RUN npm ci --ignore-scripts

# Copy shared package source and build it
COPY packages/shared ./packages/shared
RUN npm run build:shared

# Copy web app source code
COPY apps/web ./apps/web

# Build the Angular app for production
WORKDIR /app/apps/web
RUN npm run build:prod

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
