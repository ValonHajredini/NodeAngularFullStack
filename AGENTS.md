# Repository Guidelines

## Project Structure & Module Organization
- **apps/web** – Angular 20 frontend; features under `src/app`, shared UI in `src/app/shared`, global styles in `src/styles`.
- **apps/api** – Express + TypeScript backend; routes in `src/routes`, controllers in `src/controllers`, data logic in `src/services` and `src/repositories`.
- **packages/shared** – Reusable DTOs, validators, and utilities; rebuild with `npm run build:shared`.
- **docs/** – Product, QA, and analytics references supporting onboarding and releases.
- **tests/** – Playwright suites in `tests/e2e` and deployment smoke checks in `tests/deployment`; unit specs live beside source files.

## Build, Test, and Development Commands
- `npm run dev` – Start backend, frontend, and pgWeb via `start-dev.sh`.
- `make backend` / `make frontend` – Run only the API or Angular dev server.
- `npm run build` – Compile shared library plus both apps into `dist/`.
- `npm run test` – Execute Jest for API and web with combined coverage.
- `npm run test:e2e` / `npm run test:e2e:headed` – Run Playwright suites headless or headed.
- `npm run quality:check` – Lint, typecheck, and verify formatting before pushing.

## Coding Style & Naming Conventions
- Keep TypeScript strict defaults and 2-space indentation; avoid disabling ESLint rules without review.
- Prefer `camelCase` for variables/functions, `PascalCase` for classes and Angular components, and `kebab-case` filenames such as `survey-builder.component.ts`.
- Store shared tokens in `packages/shared` instead of duplicating types in each workspace.
- Format with `npm run format` and fix lint findings via `npm run lint:api` or `npm run lint:web`.

## Testing Guidelines
- Place Jest specs beside implementation (`*.spec.ts`); use helpers in `apps/api/src/utils` to mock dependencies.
- Maintain or increase coverage published in `coverage/`; add tests for every bug fix and feature change.
- Keep Playwright suites idempotent; debug failures interactively with `npm run test:e2e:ui`.

## Commit & Pull Request Guidelines
- Follow the `<type>: <subject>` format from `git-commit-guide.md`; scope commits when useful (`feat(api): add audit log stream`).
- Mention related issues and summarize the change impact and risk in commits or PRs.
- Detail validation steps in PRs (tests, screenshots for UI) and flag migrations, env updates, or docs changes.

## Security & Environment Notes
- Copy `.env.example` files into each workspace and keep secrets out of version control.
- Run `npm run security:audit` and resolve findings before cutting release branches.
- Use `make db-start` to run the expected PostgreSQL service and `make stop` to shut the stack down cleanly.
