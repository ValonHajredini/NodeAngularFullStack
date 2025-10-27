# NodeAngularFullStack – Local Setup Without Docker

This guide consolidates everything needed to stand up the Angular + Express monorepo directly on
your machine (no Docker). It covers tooling, environment files, database prep, scripts, verification
steps, and the commands you will run most often.

## 1. System Overview

```mermaid
flowchart LR
    subgraph Local Machine
        A[Angular dev server<br/>localhost:4200] -->|REST/GraphQL calls| B[Express API<br/>localhost:3000]
        B -->|pg driver| C[(PostgreSQL 14+<br/>localhost:5432)]
        B -->|redis client (optional)| D[(Redis 7+<br/>localhost:6379)]
        B -->|S3 SDK| E[(DigitalOcean Spaces<br/>file storage)]
        C -->|read only JDBC| F[pgWeb UI<br/>localhost:8080-8081]
    end
    subgraph Tooling
        G[Node.js 20+/npm 9+]
        H[Angular CLI 20]
    end
    G -. installs .-> A
    H -. compiles .-> A
```

## 2. Prerequisites

| Tool                     | Version                   | Install (macOS/Homebrew)      | Notes                                         |
| ------------------------ | ------------------------- | ----------------------------- | --------------------------------------------- |
| Node.js                  | 20.x LTS (>=18 supported) | `brew install node@20`        | `nvm` or volta also works; ensure `npm >= 9`. |
| Angular CLI              | 20.x                      | `npm install -g @angular/cli` | `start-dev.sh` auto-installs if missing.      |
| PostgreSQL               | 14.x                      | `brew install postgresql@14`  | Runs as `brew services start postgresql@14`.  |
| Redis (optional caching) | 7.x                       | `brew install redis`          | Start via `brew services start redis`.        |
| pgWeb (DB UI)            | latest                    | `brew install pgweb`          | Handy for inspecting Postgres.                |
| pnpm (optional)          | latest                    | `npm install -g pnpm`         | Not required; repo uses npm workspaces.       |

> Windows/Linux users: install equivalent packages via Chocolatey, Scoop, apt, or official
> installers. Ensure paths expose `node`, `npm`, `psql`, `pgweb`, and (optionally) `redis-server`.

## 3. Repository Layout & Key Scripts

| Path                                     | Purpose                                                                            | Useful Commands                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/api`                               | Express + TypeScript backend                                                       | `npm --workspace=apps/api run dev`, `db:migrate`, `db:seed`, `db:reset`.                         |
| `apps/web`                               | Angular 20 frontend                                                                | `npm --workspace=apps/web run dev`, `ng build`, `ng test`.                                       |
| `apps/links-api`                         | Short-links microservice POC (standalone Express service + DB + gateway)           | Run via `./start-poc.sh` (Docker), `npm --workspace=apps/links-api run dev` for local debugging. |
| `packages/shared`                        | DTOs, validators, utilities                                                        | `npm run build:shared` before publishing changes.                                                |
| `start-dev.sh` / `stop-dev.sh`           | One-touch start/stop of API, web, pgWeb (no Docker)                                | Works with `.env.development` or custom `ENV_FILE`.                                              |
| `Makefile`                               | Convenience targets (`make dev`, `make backend`, `make frontend`, `make db-start`) | Wraps the scripts above.                                                                         |
| `run_dev_env.md`, `setup_up_commands.md` | Deep dives on manual service commands                                              | Use alongside this doc for extra context.                                                        |

Logs for services started via scripts land in `logs/backend.log`, `logs/frontend.log`,
`logs/pgweb.log`.

## 4. Environment Configuration

1. Copy base env files:
   ```bash
   cp .env.development .env.local
   cp .env.example .env               # Optional reference file
   ```
2. Backend-specific overrides can live in `apps/api/.env` if you need component-specific values;
   otherwise the root env file is loaded by `start-dev.sh`.
3. **Minimum variables to update before hitting production or staging:**
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` (32+ chars)
   - `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `SENDGRID_API_KEY`, `EMAIL_FROM`, `DO_SPACES_*` keys if you exercise email/storage flows
4. Multi-tenancy toggle (single-tenant by default):
   ```env
   ENABLE_MULTI_TENANCY=false        # true to enable tenant middleware
   TENANT_ISOLATION_LEVEL=row
   TENANT_RLS_ENABLED=false
   ```
   Use `docs/ENVIRONMENT_VARIABLES.md` for the exhaustive list.
5. pgWeb auth values live in `.env.development` (`PGWEB_AUTH_USER=admin`,
   `PGWEB_AUTH_PASS=development-password`).

## 5. Database & Supporting Services

### PostgreSQL

```bash
brew services start postgresql@14
createdb nodeangularfullstack
createuser --pwprompt dbuser
psql -d postgres -c "ALTER USER dbuser WITH PASSWORD 'dbpassword';"
createdb -O dbuser nodeangularfullstack
createdb -O dbuser nodeangularfullstack_test
```

Check connectivity:

```bash
PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack -c '\conninfo'
```

### Redis (optional but recommended for caching/rate limiting)

```bash
brew services start redis          # or `redis-server /opt/homebrew/etc/redis.conf`
redis-cli ping                     # should return PONG
```

Update `.env.local` with `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` if you set one.

### pgWeb Database UI

```bash
npm run pgweb                     # wraps ./start-pgweb.sh (port 8081)
# or customize via Makefile:
make pgweb PGWEB_PORT=8080
```

Login with `admin / development-password`. The UI points at the dev database and is helpful when
exploring migrations or inspecting seed data.

## 6. Installation Checklist

1. **Install dependencies**:
   ```bash
   npm install                     # installs root + workspaces
   ```
   The script sets up `apps/api/node_modules` and `apps/web/node_modules`.
2. **(Optional) Rebuild shared package** whenever `packages/shared` changes:
   ```bash
   npm run build:shared
   ```
3. **Populate database**:
   ```bash
   npm --workspace=apps/api run db:migrate
   npm --workspace=apps/api run db:seed
   ```
4. **Unlock preset accounts (if mailing was disabled)**:
   ```bash
   npm run dev:unlock-accounts
   ```
5. **Verify toolchain**:
   ```bash
   node -v         # expect v20.x.y
   psql --version  # >= 14
   pgweb --version
   ```

## 7. Running & Stopping Services

### One-shot scripts

```bash
./start-dev.sh                    # or npm run dev / npm start / make dev
ENV_FILE=.env.local ./start-dev.sh   # load a custom env file
./stop-dev.sh
```

`start-dev.sh` will:

1. Verify `node`, `npm`, `psql`, `pgweb`, and Angular CLI are present.
2. Ensure ports `3000`, `4200`, `8080`, and `8081` are free.
3. Run `db:migrate` and `db:seed`.
4. Start the API (`apps/api run dev`), pgWeb, and Angular dev server (`apps/web run dev`) with logs
   in `logs/`.

### Manual terminals (if you prefer granular control)

Terminal A – PostgreSQL (once per reboot)

```bash
brew services start postgresql@14
```

Terminal B – API

```bash
cd apps/api
npm run dev
```

Terminal C – Frontend

```bash
cd apps/web
npm run dev
```

Terminal D – pgWeb (optional)

```bash
npm run pgweb
```

### Make targets

```bash
make backend            # npm --workspace=apps/api run dev
make frontend           # npm --workspace=apps/web run dev
make db-start           # ensures brew service
make db-stop            # stop Postgres
make logs               # tail backend + frontend logs
```

## 8. Frequently Used Commands

| Area                       | Command                                                                | Notes                                   |
| -------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Build all artifacts        | `npm run build`                                                        | Runs shared, API, and web builds.       |
| API-only build             | `npm --workspace=apps/api run build`                                   | Outputs to `apps/api/dist`.             |
| Web-only build             | `npm --workspace=apps/web run build`                                   | Outputs to `apps/web/dist`.             |
| Database migrations        | `npm --workspace=apps/api run db:migrate`                              | See also `db:reset`, `db:seed`.         |
| Route inspection           | `npm --workspace=apps/api run routes -- --json`                        | Uses scripts in `apps/api/src/scripts`. |
| Tests (all)                | `npm run test`                                                         | Runs API + web Jest suites.             |
| Tests (Playwright)         | `npm run test:e2e` / `npm run test:e2e:headed` / `npm run test:e2e:ui` | Requires browsers installed.            |
| Lint                       | `npm run lint` (`lint:api`, `lint:web`)                                | Enforces ESLint/Angular rules.          |
| Type-check                 | `npm run typecheck`                                                    | Wraps API + web TS `--noEmit`.          |
| Formatting                 | `npm run format` / `npm run format:check`                              | Prettier across repo.                   |
| Quality gate               | `npm run quality:check`                                                | Lint + typecheck + format check.        |
| Security scan              | `npm run security:audit`                                               | Executes `scripts/security-audit.js`.   |
| Metrics/feedback utilities | `npm run metrics:init`, `npm run feedback:collect`, etc.               | Optional for analytics dashboards.      |

## 9. Verification & Test Data

- **Service URLs**
  - Frontend: `http://localhost:4200`
  - API: `http://localhost:3000`
  - API Docs: `http://localhost:3000/api-docs`
  - Health check: `http://localhost:3000/health`
  - pgWeb: `http://localhost:8080` (start-dev) or `http://localhost:8081` (standalone script)
- **Seeded credentials** (after `db:seed`):  
  | Role | Email | Password | | --- | --- | --- | | Admin | `admin@example.com` | `Admin123!@#` | |
  User | `user@example.com` | `User123!@#` | | ReadOnly | `readonly@example.com` | `Read123!@#` |
- **Logs**: check `logs/backend.log`, `logs/frontend.log`, `logs/pgweb.log` for runtime errors when
  using the start script.

## 10. Troubleshooting Cheatsheet

| Symptom                  | Checks / Fixes                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Backend fails to start   | `brew services list                                                                                     | grep postgresql`; ensure `.env.local`values match your DB; re-run`db:migrate`. |
| Port already in use      | `lsof -i :3000` / `:4200` / `:8080` → `kill -9 <PID>` or run `./stop-dev.sh`.                           |
| Unable to connect to DB  | `PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack -c 'SELECT 1'`.              |
| Need to wipe & reseed    | `npm --workspace=apps/api run db:reset` (drops seed data, re-applies).                                  |
| Angular hot reload stuck | Stop the frontend terminal, delete `apps/web/.angular/cache`, restart `npm run dev`.                    |
| Redis not responding     | `redis-cli ping`; restart via `brew services restart redis`. Update `.env.local` if you set a password. |
| pgWeb auth fails         | Verify `PGWEB_AUTH_USER/PASS` in `.env.local` or `start-pgweb.sh`. Remove `.pgweb.pid` if stale.        |
| General cleanup          | `./stop-dev.sh && rm -rf logs/*.log .frontend.pid .backend.pid .pgweb.pid`.                             |

## 11. Links Microservice POC (Optional)

The repository also includes a proof-of-concept short-links microservice that demonstrates a
database-per-service pattern. It is **not** part of the default non-Docker workflow, but you can run
it independently to explore the architecture.

### Components

```mermaid
flowchart LR
    subgraph Docker Network
        GATEWAY[Nginx API Gateway :8080] --> LINKS[Links Service (apps/links-api) :3003]
        LINKS --> DB[(Links Postgres :5435)]
    end
    LINKS --> PLATFORM[Platform API (apps/api) :3000]
    GATEWAY <---> Client[Frontend/HTTP client]
```

- `apps/links-api`: Express service focused on short link + QR generation.
- `docker-compose.poc.yml`: Spins up `links-db`, `links-api`, and an Nginx gateway.
- `start-poc.sh` / `stop-poc.sh`: Helpers that install deps, run containers, execute
  migrations/seeds, and expose ports.
- `PLATFORM_API_URL`: The links service validates tokens against the main API
  (`http://localhost:3000`), so keep the primary backend running if you want authenticated flows.

### Running the POC (Docker)

```bash
./start-poc.sh                    # builds images, runs docker-compose, applies migrations + seeds
# ...
./stop-poc.sh                     # stops containers and removes the dedicated volume
```

Available endpoints afterwards:

| Service        | URL                                                                   |
| -------------- | --------------------------------------------------------------------- |
| Nginx gateway  | `http://localhost:8080` (public redirect + authenticated APIs)        |
| Links API      | `http://localhost:3003` (direct service access, mostly for debugging) |
| Links Postgres | `localhost:5435` (user `dbuser`, password `dbpassword`)               |

### Local Debug (no Docker)

If you want to run the POC service manually:

```bash
cd apps/links-api
npm install
cp .env.example .env            # update DB + platform URL
createdb links_db               # or point .env to another database
npm run db:migrate && npm run db:seed
npm run dev                     # service listens on http://localhost:3003
```

You can still front it with the gateway by running
`docker-compose -f docker-compose.poc.yml up api-gateway` (point it at your local service), or hit
the service directly for testing. See `apps/links-api/README.md` for endpoint details and test
commands.

## 12. Related Documentation

- `README.md` – project narrative and quick start
- `run_dev_env.md` – extremely detailed walkthrough of manual service orchestration
- `docs/ENVIRONMENT_VARIABLES.md` – full env var catalog
- `docs/database-seeds-and-migrations.md` – migration + seed strategy
- `setup_up_commands.md` – curated list of operational scripts
- `docs/multi-tenancy-guide.md` – how tenant isolation affects env vars and runtime behavior

With the tooling installed, env files copied, database seeded, and scripts understood, you can run
either `./start-dev.sh` for the all-in-one experience or individual `npm --workspace` commands for
fine-grained control. Happy building!
