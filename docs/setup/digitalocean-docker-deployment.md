# DigitalOcean Docker Deployment Prep

This guide walks through preparing a brand‑new DigitalOcean droplet to run the NodeAngularFullStack
project with Docker, PostgreSQL, and GitHub Actions–driven CI/CD. Follow the steps in order: first
get the server ready, then wire in DNS, certificates, and deployment automation.

---

## 1. Prerequisites

- DigitalOcean droplet running Ubuntu 22.04 LTS (4 GB RAM or higher recommended).
- Root SSH access or console access to the droplet.
- Domain control for `widgettx.com`.
- GitHub repository access (admin) to add secrets and configure Actions.
- Local workstation with `ssh` to connect to the server.

All commands below assume you are connected to the droplet as `root`. Replace values in
`<UPPERCASE>` with your data.

---

## 2. Harden the Droplet

1. Update the OS and reboot:
   ```bash
   apt update && apt upgrade -y
   reboot
   ```
2. Log back in and create a limited deploy user:
   ```bash
   adduser deploy
   password Bismilah1.
   usermod -aG sudo deploy
   ```
3. Copy your SSH key for the new user:
   ```bash
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
   ```
4. Enforce key-only SSH (optional but recommended) by editing `/etc/ssh/sshd_config`:
   ```
   PermitRootLogin no
   PasswordAuthentication no
   ```
   Then reload SSH: `systemctl restart sshd`.
5. Enable the uncomplicated firewall:
   ```bash
   ufw allow 22/tcp
   ufw allow 80,443/tcp
   ufw enable
   ufw status
   ```

---

## 3. Install Docker Engine + Compose

1. Install dependencies:
   ```bash
   apt install -y ca-certificates curl gnupg lsb-release
   ```
2. Add Docker’s apt repository:
   ```bash
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   chmod a+r /etc/apt/keyrings/docker.gpg
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```
3. Install engine + compose plugin:
   ```bash
   apt update
   apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```
4. Allow the `deploy` user to run Docker:
   ```bash
   usermod -aG docker deploy
   su - deploy
   docker info
   ```
   Log out/in if the group change is not applied yet.

---

## 4. Directory Layout on the Server

Create a home for deployments and persistent data:

```bash
sudo mkdir -p /opt/widgettx/{config,shared,logs}
sudo mkdir -p /opt/widgettx/data/postgres
sudo chown -R deploy:deploy /opt/widgettx
```

Recommended structure:

```
/opt/widgettx
├─ config
│  ├─ .env               # Shared environment variables
│  ├─ traefik
│  │  ├─ dynamic.yml     # Optional per-service routes
│  │  └─ acme.json       # Let's Encrypt cert storage
│  └─ docker-compose.yml
├─ data
│  └─ postgres           # PostgreSQL volume
├─ logs
└─ shared                # Uploaded files / assets
```

---

## 5. DNS for Required Subdomains

Point the following records at the droplet’s public IPv4 address:

| Hostname                  | Type | Value          |
| ------------------------- | ---- | -------------- |
| `widgettx.com` (optional) | A    | `<DROPLET_IP>` |
| `superadmin.widgettx.com` | A    | `<DROPLET_IP>` |
| `api.widgettx.com`        | A    | `<DROPLET_IP>` |

Propagation can take up to 30 minutes. Keep DNS TTL low (300s) during initial setup.

---

## 6. Reverse Proxy & TLS (Traefik)

Traefik will terminate TLS, request certificates from Let’s Encrypt, and forward traffic to the
frontend and backend containers.

1. Create the configuration directory and files:
   ```bash
   mkdir -p /opt/widgettx/config/traefik
   touch /opt/widgettx/config/traefik/dynamic.yml
   touch /opt/widgettx/config/traefik/acme.json
   chmod 600 /opt/widgettx/config/traefik/acme.json
   ```
2. Populate `/opt/widgettx/config/traefik/dynamic.yml` with a baseline (can stay empty initially).
3. Add the Traefik service to `docker-compose.yml` (see section 8).

---

## 7. Environment Variables

Use `/opt/widgettx/config/.env` to centralize secrets for Docker Compose. Suggested keys:

```
# Global
NODE_ENV=production

# Angular (served as static app)
PUBLIC_BASE_URL=https://superadmin.widgettx.com
PUBLIC_API_URL=https://api.widgettx.com/api/v1

# API container
API_PORT=3000
API_HOSTNAME=api.widgettx.com
FRONTEND_URL=https://superadmin.widgettx.com
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nodeangularfullstack
DB_USER=dbuser
DB_PASSWORD=<STRONG_DB_PASSWORD>
DATABASE_URL=postgresql://dbuser:<STRONG_DB_PASSWORD>@postgres:5432/nodeangularfullstack
REDIS_URL=redis://redis:6379
JWT_SECRET=<GENERATE_64_CHAR>
JWT_REFRESH_SECRET=<GENERATE_64_CHAR>
FORM_RENDER_TOKEN_SECRET=<GENERATE_64_CHAR>

# Postgres
POSTGRES_DB=nodeangularfullstack
POSTGRES_USER=dbuser
POSTGRES_PASSWORD=<STRONG_DB_PASSWORD>
POSTGRES_INITDB_ARGS=--encoding=UTF8

# Traefik / Let's Encrypt
TRAEFIK_ACME_EMAIL=ops@widgettx.com
```

`DB_PASSWORD` and `POSTGRES_PASSWORD` must stay identical. Keep this file out of version control.
For GitHub Actions, mirror the same values via repository secrets.

---

## 8. Docker Compose Stack

Create `/opt/widgettx/config/docker-compose.yml` with the following baseline (adjust image tags
later when CI builds real images):

```yaml
version: '3.9'

services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    command:
      - '--providers.docker=true'
      - '--providers.docker.exposedbydefault=false'
      - '--entrypoints.web.address=:80'
      - '--entrypoints.websecure.address=:443'
      - '--certificatesresolvers.le.acme.tlschallenge=true'
      - '--certificatesresolvers.le.acme.email=${TRAEFIK_ACME_EMAIL}'
      - '--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/acme.json:/letsencrypt/acme.json
      - ./traefik/dynamic.yml:/traefik/dynamic.yml
    networks:
      - proxy

  web:
    image: ghcr.io/widgettx/nodeangularfullstack/web:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PUBLIC_API_URL=${PUBLIC_API_URL}
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.web.rule=Host(`superadmin.widgettx.com`)'
      - 'traefik.http.routers.web.entrypoints=websecure'
      - 'traefik.http.routers.web.tls.certresolver=le'
      - 'traefik.http.services.web.loadbalancer.server.port=80'
    networks:
      - proxy

  api:
    image: ghcr.io/widgettx/nodeangularfullstack/api:latest
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - FRONTEND_URL=${FRONTEND_URL}
    depends_on:
      - postgres
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.api.rule=Host(`api.widgettx.com`)'
      - 'traefik.http.routers.api.entrypoints=websecure'
      - 'traefik.http.routers.api.tls.certresolver=le'
      - 'traefik.http.services.api.loadbalancer.server.port=${API_PORT}'
    networks:
      - proxy
      - internal

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ../data/postgres:/var/lib/postgresql/data
    networks:
      - internal

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ['redis-server', '--save', '60', '1', '--loglevel', 'warning']
    networks:
      - internal

networks:
  proxy:
    external: false
  internal:
    external: false
```

**Notes**

- Replace `ghcr.io/widgettx/nodeangularfullstack/...` with the actual image locations once CI/CD
  builds them.
- The Angular app should be built to a static Nginx image that exposes port 80.
- The API exposes `API_PORT` (default 3000). Ensure the container listens on the same port.

---

## 9. Initial Manual Deployment

1. Log in as `deploy`: `ssh deploy@superadmin.widgettx.com`.
2. Populate `/opt/widgettx/config/.env` with production values.
3. Pull placeholder images (if already pushed) or build locally on the droplet for the first run:
   ```bash
   cd /opt/widgettx/config
   docker compose pull    # requires images to exist in the registry
   docker compose up -d
   docker compose ps
   ```
4. Inspect Traefik logs to verify TLS issuance:
   ```bash
   docker logs -f config-traefik-1
   ```
5. Visit `https://superadmin.widgettx.com` and `https://api.widgettx.com/health` (or equivalent
   endpoint) to confirm connectivity.

---

## 10. Database Maintenance

- Use `docker exec -it config-postgres-1 psql -U ${POSTGRES_USER} ${POSTGRES_DB}` to access the
  database.
- Schedule automated backups (e.g., via `pg_dump` and cron) in `/opt/widgettx/backups`.
- Monitor disk usage: `df -h` and `docker system df`.

---

## 11. SSH Access for GitHub Actions

CI/CD will deploy by SSH-ing into the droplet and running
`docker compose pull && docker compose up -d`.

1. From the droplet (as `deploy`), generate a dedicated deploy key:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions@widgettx"
   ```
2. Copy the public key to `~/.ssh/authorized_keys` (append the contents of `github_deploy.pub`).
3. Download the private key and add it as a GitHub Actions secret, e.g. `DO_SSH_KEY`.
4. Capture the server info as repository secrets:
   - `DO_HOST`: `superadmin.widgettx.com`
   - `DO_USER`: `deploy`
   - `DO_SSH_KEY`: (private key contents)
   - `REGISTRY_USERNAME`, `REGISTRY_TOKEN`: credentials for GitHub Container Registry (typically
     `GITHUB_ACTOR` + PAT).
   - `ENV_FILE`: base64-encoded contents of `/opt/widgettx/config/.env` or individual secrets as
     needed.

**Security tip:** Restrict the deploy key to the droplet by using SSH command restrictions if
desired.

---

## 12. Preparing for GitHub Actions CI/CD

Once Docker images are defined in the repository:

1. Configure GitHub Actions workflow to:
   - Install dependencies and run lint/tests (`npm run test`, `npm run quality:check`).
   - Build production artifacts:
     - Backend Docker image (from `apps/api`).
     - Frontend Docker image (build Angular, serve with Nginx).
   - Push both images to GitHub Container Registry with tags `latest` and Git SHA.
   - Deploy via `appleboy/ssh-action` or similar:
     ```yaml
     - name: Deploy
       uses: appleboy/ssh-action@v1.0.3
       with:
         host: ${{ secrets.DO_HOST }}
         username: ${{ secrets.DO_USER }}
         key: ${{ secrets.DO_SSH_KEY }}
         script: |
           cd /opt/widgettx/config
           docker compose pull
           docker compose up -d
           docker image prune -f
     ```
2. Ensure the workflow writes updated environment files if needed (e.g., using `scp` to upload
   `.env` in a preceding step, or using secrets to template it).
3. Protect the main branch and require passing CI before deployment.

---

## 13. Monitoring & Logs

- `docker compose logs -f api` to monitor backend.
- `docker compose logs -f web` to monitor frontend.
- `docker compose logs -f traefik` to monitor TLS/cert issues.
- Set up DigitalOcean monitoring (CPU, memory) via the control panel.
- Optionally install Fail2ban or CrowdSec for additional protection.

---

## 14. Maintenance Checklist

- Keep Ubuntu patched: `sudo apt update && sudo apt upgrade -y`.
- Rotate JWT and database passwords periodically; update `.env` and redeploy.
- Backup PostgreSQL regularly off-droplet.
- Review TLS certificate renewal logs monthly (Traefik should auto-renew).
- Periodically prune unused images/volumes: `docker system prune`.
- Document disaster recovery steps (droplet snapshot + `.env` offsite + DB dumps).

---

With these steps complete, the droplet is ready for Dockerized deployments of the
NodeAngularFullStack project using GitHub Actions. The next phase is adding Dockerfiles, build
scripts, and the CI workflow within the repository. Refer back to this guide whenever
re-provisioning or scaling the environment.
