# Docker Deployment Guide

This guide explains how to run the NodeAngularFullStack application using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Installation

**macOS:**

```bash
brew install docker docker-compose
# Or download Docker Desktop from https://www.docker.com/products/docker-desktop
```

**Linux:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Windows:** Download Docker Desktop from https://www.docker.com/products/docker-desktop

## Quick Start

### 1. Configure Environment

```bash
# Copy the Docker environment template
cp .env.docker .env.docker.local

# Edit .env.docker.local with your configuration
# IMPORTANT: Change JWT secrets and passwords for production!
```

### 2. Start Services

```bash
# Start all services (API, Frontend, PostgreSQL)
./docker-start.sh

# Or with pgWeb database UI
./docker-start.sh --with-pgweb

# Force rebuild of images
./docker-start.sh --build

# Run in foreground (see logs in terminal)
./docker-start.sh --foreground
```

### 3. Access Services

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **pgWeb UI** (if started with --with-pgweb): http://localhost:8080

### 4. Stop Services

```bash
./docker-stop.sh
```

## Docker Architecture

### Services

The application consists of four Docker services:

1. **postgres** - PostgreSQL 14 database
   - Port: 5432
   - Volume: `postgres_data` (persistent storage)
   - Auto-runs migrations on startup

2. **api** - Express.js backend API
   - Port: 3000
   - Depends on: postgres
   - Multi-stage build for optimized image size

3. **web** - Angular frontend (nginx)
   - Port: 80
   - Depends on: api
   - nginx reverse proxy for API calls
   - Multi-stage build for optimized image size

4. **pgweb** - Database UI (optional)
   - Port: 8080
   - Profile: `tools` (only starts with --with-pgweb flag)
   - Web-based PostgreSQL client

### Docker Compose Profiles

**Default profile** (no flag): Starts postgres, api, and web

**Tools profile** (--with-pgweb): Adds pgWeb database UI

```bash
# Start with tools profile
./docker-start.sh --with-pgweb

# Or manually
docker-compose --profile tools up
```

### Multi-Stage Builds

Both API and web Dockerfiles use multi-stage builds:

1. **Builder stage**: Installs all dependencies, builds shared package, compiles TypeScript
2. **Production stage**: Copies only production dependencies and built artifacts

Benefits:

- Smaller final image size (50-70% reduction)
- No dev dependencies in production
- Faster deployment and startup

## Configuration

### Environment Variables

All configuration is managed through `.env.docker.local`. Key variables:

| Variable             | Default                                  | Description          |
| -------------------- | ---------------------------------------- | -------------------- |
| `NODE_ENV`           | `production`                             | Node environment     |
| `POSTGRES_DB`        | `nodeangularfullstack`                   | Database name        |
| `POSTGRES_USER`      | `dbuser`                                 | Database user        |
| `POSTGRES_PASSWORD`  | `dbpassword`                             | Database password    |
| `API_PORT`           | `3000`                                   | Backend API port     |
| `WEB_PORT`           | `80`                                     | Frontend port        |
| `PGWEB_PORT`         | `8080`                                   | pgWeb UI port        |
| `JWT_SECRET`         | (change in production)                   | JWT signing secret   |
| `JWT_REFRESH_SECRET` | (change in production)                   | JWT refresh secret   |
| `CORS_ORIGIN`        | `http://localhost:4200,http://localhost` | Allowed CORS origins |

**IMPORTANT**: Always change `JWT_SECRET` and `JWT_REFRESH_SECRET` in production!

### Port Mapping

You can customize ports by editing `.env.docker.local`:

```bash
# Use port 8080 for frontend instead of 80
WEB_PORT=8080

# Use port 5000 for API instead of 3000
API_PORT=5000
```

## Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

### Database Operations

```bash
# Run migrations
docker-compose exec api npm run db:migrate

# Seed database
docker-compose exec api npm run db:seed

# Reset database (clear and re-seed)
docker-compose exec api npm run db:reset

# Access PostgreSQL shell
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack
```

### Container Management

```bash
# Restart services
docker-compose restart

# Restart specific service
docker-compose restart api

# Stop services (keeps containers)
docker-compose stop

# Start stopped services
docker-compose start

# Remove containers (keeps volumes)
docker-compose down

# Remove containers and volumes (WARNING: deletes database!)
docker-compose down -v
```

### Rebuild Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build api

# Rebuild and restart
./docker-start.sh --build
```

### Execute Commands in Containers

```bash
# Run shell in API container
docker-compose exec api sh

# Run shell in web container
docker-compose exec web sh

# Run npm command in API container
docker-compose exec api npm run lint
```

## Production Deployment

### Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random values
- [ ] Change `POSTGRES_PASSWORD` to a strong password
- [ ] Update `CORS_ORIGIN` to your production domain
- [ ] Review and adjust rate limiting settings
- [ ] Enable HTTPS/SSL (use reverse proxy like nginx or Traefik)
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Review security headers in nginx.conf
- [ ] Set `NODE_ENV=production`

### Recommended Production Setup

1. **Use Docker Swarm or Kubernetes** for orchestration
2. **Set up reverse proxy** (nginx, Traefik, or Caddy) for SSL termination
3. **Use external PostgreSQL** for better data management and backups
4. **Configure log aggregation** (ELK stack, Datadog, or CloudWatch)
5. **Set up health checks** and monitoring (Prometheus, Grafana)
6. **Use Docker secrets** for sensitive data (passwords, JWT secrets)

### Example Production docker-compose.yml Overrides

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    environment:
      NODE_ENV: production
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure

  web:
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Port Already in Use

If ports 3000, 80, or 5432 are already in use:

1. Stop conflicting services
2. Change ports in `.env.docker.local`
3. Restart: `./docker-stop.sh && ./docker-start.sh`

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection from API container
docker-compose exec api sh -c 'nc -zv postgres 5432'
```

### API Not Starting

```bash
# Check API logs
docker-compose logs api

# Verify database connection
docker-compose exec api npm run db:migrate

# Restart API service
docker-compose restart api
```

### Frontend Not Loading

```bash
# Check web logs
docker-compose logs web

# Verify nginx config
docker-compose exec web nginx -t

# Check API connectivity
curl http://localhost:3000/health
```

### Build Failures

```bash
# Clean Docker cache and rebuild
docker-compose down
docker system prune -a
./docker-start.sh --build

# Check disk space
docker system df
```

### Container Keeps Restarting

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs <service-name>

# Inspect container
docker inspect <container-name>
```

## Performance Optimization

### Image Size Optimization

The Dockerfiles use multi-stage builds to minimize image size:

- **API image**: ~200MB (from ~800MB without multi-stage)
- **Web image**: ~50MB (nginx-alpine + built Angular app)

### Build Caching

Docker caches layers. For faster rebuilds:

1. Install dependencies first (rarely changes)
2. Copy source code last (changes frequently)
3. Use `.dockerignore` to exclude unnecessary files

### Resource Limits

Add resource limits in docker-compose.yml:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Development with Docker

### Hot Reload Development

For development with hot reload, use volume mounts:

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  api:
    volumes:
      - ./apps/api/src:/app/apps/api/src
      - ./packages/shared/src:/app/packages/shared/src
    environment:
      NODE_ENV: development
    command: npm run dev

  web:
    volumes:
      - ./apps/web/src:/app/apps/web/src
    command: npm run dev
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Node.js in Docker](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [nginx Docker Documentation](https://hub.docker.com/_/nginx)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. View logs: `docker-compose logs -f`
3. Review the main README.md for project-specific information
