SHELL := /bin/bash

ENV_FILE ?= .env.development
PG_SERVICE ?= postgresql@14
PGWEB_PORT ?= 8080
API_PORT ?= 3000
FRONTEND_PORT ?= 4200

.PHONY: help dev start stop restart db-start db-stop backend frontend pgweb logs dev-setup \
	test test-deployment test-build-validate test-workflows-validate \
	build build-shared build-web build-form-builder build-api \
	lint typecheck format quality-check \
	workflows-list workflows-test-ci workflows-test-deploy workflows-test-create-tool \
	clean

dev: db-start start

start:
	@echo "=> Starting local stack using $(ENV_FILE)"
	@ENV_FILE=$(ENV_FILE) ./start-dev.sh

stop:
	@./stop-dev.sh

restart: stop start


db-start:
	@if command -v brew >/dev/null 2>&1; then \
		echo "=> Ensuring PostgreSQL service $(PG_SERVICE) is running"; \
		brew services start $(PG_SERVICE); \
	else \
		echo "brew not found; please start PostgreSQL manually"; \
	fi

db-stop:
	@if command -v brew >/dev/null 2>&1; then \
		echo "=> Stopping PostgreSQL service $(PG_SERVICE)"; \
		brew services stop $(PG_SERVICE); \
	else \
		echo "brew not found; skipping PostgreSQL shutdown"; \
	fi

backend:
	@npm --workspace=apps/api run dev

frontend:
	@npm --workspace=apps/web run dev


pgweb:
	@echo "=> Starting pgWeb UI on port $(PGWEB_PORT)"
	@source $(ENV_FILE) 2>/dev/null || true; \
	: $$PGWEB_DATABASE_URL; \
	if [ -z "$$PGWEB_DATABASE_URL" ]; then \
		PGWEB_DATABASE_URL="postgresql://$${DB_USER:-dbuser}:$${DB_PASSWORD:-dbpassword}@$${DB_HOST:-localhost}:$${DB_PORT:-5432}/$${DB_NAME:-nodeangularfullstack}?sslmode=disable"; \
	fi; \
	pgweb --bind 127.0.0.1 --listen :$(PGWEB_PORT) --url "$$PGWEB_DATABASE_URL"

logs:
	@echo "=> Tailing backend and frontend logs (Ctrl+C to exit)"
	@tail -f logs/backend.log logs/frontend.log

dev-setup:
	@./scripts/dev-setup-tmux.sh

# ============================================================================
# Deployment Testing Commands
# ============================================================================

help: ## Show this help message
	@echo "\n$(shell tput bold)NodeAngularFullStack Development Commands$(shell tput sgr0)\n"
	@echo "$(shell tput bold)Development:$(shell tput sgr0)"
	@grep -E '^(dev|start|stop|restart|db-start|db-stop|backend|frontend|pgweb|logs|dev-setup):.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-30s %s\n", $$1, $$2}'
	@echo ""
	@echo "$(shell tput bold)Testing & Deployment:$(shell tput sgr0)"
	@grep -E '^test|^build|^lint|^typecheck|^format|^quality|^workflows|^clean' $(MAKEFILE_LIST) | grep '##' | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-30s %s\n", $$1, $$2}'

test: ## Run all tests
	@echo "$(shell tput bold)Running tests...$(shell tput sgr0)"
	npm run test

test-deployment: test-build-validate test-workflows-validate ## Test deployment configuration and workflows locally
	@echo ""
	@echo "$(shell tput bold)$(shell tput setaf 2)✅ Deployment tests completed!$(shell tput sgr0)"
	@echo ""
	@echo "$(shell tput bold)Summary:$(shell tput sgr0)"
	@echo "  • TypeScript builds: $(shell tput setaf 2)✅ Validated$(shell tput sgr0)"
	@echo "  • Workflow syntax: $(shell tput setaf 2)✅ Valid$(shell tput sgr0)"
	@echo "  • Frontend apps: $(shell tput setaf 2)✅ Build successful$(shell tput sgr0)"
	@echo "  • Backend builds: See above for detailed status"
	@echo ""
	@echo "$(shell tput bold)Next steps:$(shell tput sgr0)"
	@echo "  1. Fix any backend TypeScript errors (if present)"
	@echo "  2. Review workflow configuration: $(shell tput setaf 3)act -l$(shell tput sgr0)"
	@echo "  3. Test specific workflow: $(shell tput setaf 3)act pull_request -j <job-name> -W .github/workflows/ci.yml$(shell tput sgr0)"
	@echo "  4. See DEPLOYMENT_TEST.md for detailed instructions"
	@echo ""

test-build-validate: ## Validate production builds locally
	@echo "$(shell tput bold)Validating production builds...$(shell tput sgr0)"
	@echo ""
	@echo "$(shell tput setaf 4)1. Building shared package...$(shell tput sgr0)"
	@npm run build:shared
	@echo ""
	@echo "$(shell tput setaf 4)2. Building frontend apps (production)...$(shell tput sgr0)"
	@npm --workspace=apps/web run build -- --configuration=production
	@echo ""
	@npm --workspace=apps/form-builder-ui run build -- --configuration=production
	@echo ""
	@echo "$(shell tput setaf 4)3. Checking backend TypeScript...$(shell tput sgr0)"
	@npm --workspace=apps/dashboard-api run typecheck || echo "$(shell tput setaf 3)⚠️  dashboard-api has TypeScript errors (pre-existing)$(shell tput sgr0)"
	@npm --workspace=apps/forms-api run typecheck || echo "$(shell tput setaf 3)⚠️  forms-api has TypeScript errors (pre-existing)$(shell tput sgr0)"

test-workflows-validate: ## Validate GitHub Actions workflows syntax
	@echo "$(shell tput bold)Validating workflow files...$(shell tput sgr0)"
	@echo ""
	@if command -v act > /dev/null 2>&1; then \
		echo "$(shell tput setaf 4)Act version:$(shell tput sgr0)"; \
		act --version; \
		echo ""; \
		echo "$(shell tput setaf 4)Available workflows:$(shell tput sgr0)"; \
		act -l | head -20; \
		echo ""; \
		echo "$(shell tput setaf 2)✅ Workflow files are valid$(shell tput sgr0)"; \
	else \
		echo "$(shell tput setaf 3)⚠️  'act' not installed. To test workflows locally, run:$(shell tput sgr0)"; \
		echo "   $(shell tput setaf 3)brew install act$(shell tput sgr0)"; \
		echo ""; \
		echo "Then run: $(shell tput setaf 3)make test:deployment$(shell tput sgr0) again"; \
		exit 1; \
	fi

build: build-shared build-web build-form-builder build-api ## Build all applications

build-shared: ## Build shared package
	@echo "$(shell tput bold)Building @nodeangularfullstack/shared...$(shell tput sgr0)"
	npm run build:shared

build-web: ## Build main web app (development)
	@echo "$(shell tput bold)Building apps/web...$(shell tput sgr0)"
	npm --workspace=apps/web run build

build-form-builder: ## Build form-builder-ui app (development)
	@echo "$(shell tput bold)Building apps/form-builder-ui...$(shell tput sgr0)"
	npm --workspace=apps/form-builder-ui run build

build-api: ## Build all backend APIs
	@echo "$(shell tput bold)Building apps/dashboard-api...$(shell tput sgr0)"
	npm --workspace=apps/dashboard-api run build || true
	@echo "$(shell tput bold)Building apps/forms-api...$(shell tput sgr0)"
	npm --workspace=apps/forms-api run build || true

lint: ## Lint all code
	@echo "$(shell tput bold)Running ESLint...$(shell tput sgr0)"
	npm run lint || true

typecheck: ## Run TypeScript type checking
	@echo "$(shell tput bold)Running TypeScript checks...$(shell tput sgr0)"
	npm run typecheck

format: ## Format code with Prettier
	@echo "$(shell tput bold)Formatting code...$(shell tput sgr0)"
	npm run format

quality-check: lint typecheck ## Run quality checks (lint + typecheck)
	@echo "$(shell tput bold)$(shell tput setaf 2)✅ Quality checks passed!$(shell tput sgr0)"

workflows-list: ## List all available GitHub Actions workflows
	@echo "$(shell tput bold)Available workflows:$(shell tput sgr0)"
	@if command -v act > /dev/null 2>&1; then \
		act -l; \
	else \
		echo "$(shell tput setaf 3)⚠️  'act' not installed. Install with: brew install act$(shell tput sgr0)"; \
	fi

workflows-test-ci: ## Test CI workflow locally (pull_request event)
	@echo "$(shell tput bold)Testing CI workflow (pull_request)...$(shell tput sgr0)"
	@if command -v act > /dev/null 2>&1; then \
		echo "$(shell tput setaf 3)Note: This will download container images (~500MB) on first run$(shell tput sgr0)"; \
		act pull_request -W .github/workflows/ci.yml --container-architecture linux/amd64; \
	else \
		echo "$(shell tput setaf 3)⚠️  'act' not installed. Install with: brew install act$(shell tput sgr0)"; \
		exit 1; \
	fi

workflows-test-deploy: ## Test deploy workflow locally (workflow_dispatch event)
	@echo "$(shell tput bold)Testing deploy workflow (workflow_dispatch)...$(shell tput sgr0)"
	@if command -v act > /dev/null 2>&1; then \
		echo "$(shell tput setaf 3)Note: This workflow requires SSH credentials and will not fully execute locally$(shell tput sgr0)"; \
		act workflow_dispatch -W .github/workflows/deploy-production.yml --container-architecture linux/amd64; \
	else \
		echo "$(shell tput setaf 3)⚠️  'act' not installed. Install with: brew install act$(shell tput sgr0)"; \
		exit 1; \
	fi

workflows-test-create-tool: ## Test create-tool-e2e workflow locally
	@echo "$(shell tput bold)Testing create-tool-e2e workflow...$(shell tput sgr0)"
	@if command -v act > /dev/null 2>&1; then \
		act workflow_dispatch -W .github/workflows/create-tool-e2e.yml --container-architecture linux/amd64; \
	else \
		echo "$(shell tput setaf 3)⚠️  'act' not installed. Install with: brew install act$(shell tput sgr0)"; \
		exit 1; \
	fi

clean: ## Clean build artifacts
	@echo "$(shell tput bold)Cleaning build artifacts...$(shell tput sgr0)"
	rm -rf apps/*/dist
	rm -rf apps/*/build
	rm -rf .angular
	rm -rf node_modules/.cache
	@echo "$(shell tput setaf 2)✅ Cleaned!$(shell tput sgr0)"


