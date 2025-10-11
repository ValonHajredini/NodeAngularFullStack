# Setup & Ops Commands

## Routes

- `npm --workspace=apps/api run routes` – simple table of all API routes.
- `npm --workspace=apps/api run routes -- --json` – JSON output for automation.
- `npm --workspace=apps/api run routes:advanced -- --method=GET --path=tools` – filter by HTTP
  method and path.
- Scripts are defined in `apps/api/package.json:29` and implemented in:
  - `apps/api/src/scripts/list-routes.ts:1`
  - `apps/api/src/scripts/simple-routes.ts:1`

## Build

- `npm run build` – compile shared library plus both apps.
- `npm --workspace=apps/api run build` – build Express API only.
- `npm --workspace=apps/web run build` – build Angular frontend only.
- `npm run build:shared` – build reusable DTOs/utilities in `packages/shared`.
- All scripts live in the root `package.json:15`.

## Migrations

- Apply pending migrations: `npm --workspace=apps/api run db:migrate` (see
  `apps/api/package.json:26`).
- Inspect migration files: `ls apps/api/database/migrations`.
- Check applied migrations:
  ```bash
  psql -U dbuser -d nodeangularfullstack_dev -c \
    "SELECT name, executed_at FROM migrations ORDER BY executed_at DESC;"
  ```
  Documentation: `docs/database-seeds-and-migrations.md:67`.
- Roll back a specific SQL file (requires appropriate env vars):
  ```bash
  cd apps/api
  ts-node -e "import('./src/utils/migration.utils').then(m => m.MigrationUtils.runMigration('DOWN_015_remove_forms_tables.sql'))"
  ```
  Each `DOWN_*.sql` reverses its matching forward migration (overview in
  `docs/database-seeds-and-migrations.md:80`).

## Seeds & Reset

- Seed database: `npm --workspace=apps/api run db:seed`.
- Clear seed data only:
  ```bash
  cd apps/api
  ts-node -e "import('./src/utils/seed.utils').then(s => s.SeedUtils.clearTestData())"
  ```
- Reset (clear → migrate → seed): `npm --workspace=apps/api run db:reset`.
- Full setup shortcut: `npm --workspace=apps/api run db:setup` (`apps/api/database/setup.ts:1`).
- Seed utilities and docs:
  - Implementation: `apps/api/src/utils/seed.utils.ts:1`
  - Seeds directory: `apps/api/database/seeds`
  - Guide: `docs/database-seeds-and-migrations.md:170`

## Tenancy Configuration

- Key environment variables (see `.env.example`):
  - `ENABLE_MULTI_TENANCY`
  - `TENANT_ISOLATION_LEVEL`
  - `TENANT_RLS_ENABLED`
  - `TENANT_CROSS_ACCESS_PREVENTION`
  - `TENANT_AUDIT_LOGGING`
  - `TENANT_TOKEN_ISOLATION`
- Full reference: `docs/ENVIRONMENT_VARIABLES.md`.
- Runtime validation and helpers: `apps/api/src/config/tenant.config.ts:1`.
- Enabling multi-tenancy affects seeding behavior (tenant-aware users) and tenant middleware
  throughout the API.
