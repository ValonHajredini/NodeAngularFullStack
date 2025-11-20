SHELL := /bin/bash

ENV_FILE ?= .env.development
PG_SERVICE ?= postgresql@14
PGWEB_PORT ?= 8080
API_PORT ?= 3000
FRONTEND_PORT ?= 4200

.PHONY: dev start stop restart db-start db-stop backend frontend pgweb logs dev-setup

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


