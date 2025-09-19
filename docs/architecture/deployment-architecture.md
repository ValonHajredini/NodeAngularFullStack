# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Digital Ocean App Platform (Static Sites)
- **Build Command:** `npm run build:web`
- **Output Directory:** `dist/apps/web`
- **CDN/Edge:** CloudFlare CDN with custom domain

**Backend Deployment:**
- **Platform:** Digital Ocean App Platform (Apps)
- **Build Command:** `npm run build:api`
- **Deployment Method:** Docker container with auto-scaling

## CI/CD Pipeline
```yaml
# .github/workflows/deploy.yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        run: |
          docker build -f infrastructure/docker/Dockerfile.api -t registry.digitalocean.com/project/api:${{ github.sha }} .
          docker push registry.digitalocean.com/project/api:${{ github.sha }}
      - name: Deploy to Digital Ocean
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
        run: |
          doctl apps create-deployment ${{ secrets.APP_ID }} --image registry.digitalocean.com/project/api:${{ github.sha }}

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build frontend
        run: |
          npm ci
          npm run build:web
      - name: Deploy to Digital Ocean Static Sites
        uses: digitalocean/action-static-site@v1
        with:
          app_name: nodeangularfullstack-web
          source_dir: dist/apps/web
```

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|------------|--------------|-------------|---------|
| Development | http://localhost:4200 | http://localhost:3000 | Local development |
| Staging | https://staging.example.com | https://api-staging.example.com | Pre-production testing |
| Production | https://app.example.com | https://api.example.com | Live environment |
