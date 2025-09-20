#!make
SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c

###################################################################################################
## DEV COMMANDS
###################################################################################################

PROJECT_NAME := $(shell basename $(CURDIR))

RED := $(shell tput -Txterm setaf 1)
GREEN := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
CYAN := $(shell tput -Txterm setaf 6)
WHITE := $(shell tput -Txterm setaf 7)
RESET := $(shell tput -Txterm sgr0)

## docker compose v2 por padrão (ajuste se usar v1)
DC ?= docker compose

ENV_FILE ?= .env
$(ENV_FILE):
	@cp .env.example $(ENV_FILE) || true

.PHONY: setup
setup: $(ENV_FILE) ##@DEV Initialize environment configuration
	@echo "$(CYAN)[ENV]$(RESET) Using $(ENV_FILE) for $(PROJECT_NAME)"
	@echo "$(GREEN)[OK]$(RESET) Setup complete!"

.PHONY: audit
audit: ##@DEV Run npm audit and fix vulnerabilities
	@echo "$(CYAN)[AUDIT]$(RESET) Running npm audit..."
	@npm audit fix || true

.PHONY: outdated
outdated: ##@DEV Check for outdated dependencies
	@echo "$(CYAN)[OUTDATED]$(RESET) Checking for outdated dependencies..."
	@npm outdated || true

.PHONY: update
update: ##@DEV Update dependencies to latest compatible versions
	@echo "$(CYAN)[UPDATE]$(RESET) Updating dependencies..."
	@npm update

###################################################################################################
## NESTJS COMMANDS
###################################################################################################

.PHONY: start
start: db-setup ##@NESTJS Start the application in development mode
	@echo "$(CYAN)[START]$(RESET) Starting the application in development mode..."
	@npm run start:dev

.PHONY: build
build: ##@NESTJS Build the application
	@echo "$(CYAN)[BUILD]$(RESET) Building the application..."
	@npm run build
	@echo "$(GREEN)[OK]$(RESET) Build complete!"

.PHONY: test
test: ##@NESTJS Run unit tests
	@echo "$(CYAN)[TEST]$(RESET) Running unit tests..."
	@npm run test

.PHONY: cov
cov: ##@NESTJS Run unit tests with coverage
	@echo "$(CYAN)[COVERAGE]$(RESET) Running unit tests with coverage..."
	@npm run test:cov

.PHONY: lint
lint: ##@NESTJS Run formatting and linting
	@echo "$(CYAN)[LINT]$(RESET) Running linting and formatting..."
	@npm run format && npm run lint
	@echo "$(GREEN)[OK]$(RESET) Linting and formatting complete!"

.PHONY: e2e
e2e: ##@NESTJS Run E2E tests (Supertest)
	@echo "$(CYAN)[E2E]$(RESET) Running e2e tests..."
	@npm run test:e2e

###################################################################################################
## DATABASE / PRISMA / FLYWAY
###################################################################################################

.PHONY: db-gen
db-gen: ##@PRISMA Generate Prisma client
	@echo "$(CYAN)[PRISMA]$(RESET) Generating Prisma client..."
	@npm run db:generate
	@echo "$(GREEN)[OK]$(RESET) Prisma client generated!"

.PHONY: db-studio
db-studio: ##@PRISMA Open Prisma Studio
	@echo "$(CYAN)[PRISMA]$(RESET) Opening Prisma Studio..."
	@npm run db:studio

.PHONY: db-pull
db-pull: ##@PRISMA Pull DB schema into Prisma (keeps Prisma as client-only)
	@echo "$(CYAN)[PRISMA]$(RESET) Pulling database schema..."
	@npx prisma db pull
	@echo "$(GREEN)[OK]$(RESET) Prisma schema updated from DB!"

.PHONY: db-diff
db-diff: ##@PRISMA Diff DB vs schema.prisma and print SQL (for Flyway drafts)
	@echo "$(CYAN)[PRISMA]$(RESET) Generating SQL diff (from DB -> schema.prisma)..."
	@test -n "$$DATABASE_URL" || (echo "$(RED)DATABASE_URL is not set$(RESET)"; exit 1)
	@npx prisma migrate diff --from-url "$${DATABASE_URL}" --to-schema-datamodel ./prisma/schema.prisma --script | tee /tmp/flyway_draft.sql
	@echo "$(YELLOW)[INFO]$(RESET) Draft saved to /tmp/flyway_draft.sql (copy to flyway/sql/VX__*.sql)"

.PHONY: db-migrate
db-migrate: ##@FLYWAY Apply Flyway migrations (docker run)
	@echo "$(CYAN)[FLYWAY]$(RESET) Migrating..."
	@npm run db:migrate
	@echo "$(GREEN)[OK]$(RESET) Flyway migrations applied!"

.PHONY: db-info
db-info: ##@FLYWAY Show Flyway info
	@$(DC) run --rm flyway -configFiles=/flyway/conf/flyway.conf info

.PHONY: db-validate
db-validate: ##@FLYWAY Validate Flyway migrations
	@$(DC) run --rm flyway -configFiles=/flyway/conf/flyway.conf validate

.PHONY: db-clean
db-clean: ##@FLYWAY Clean database schema (DANGER: drops all objects)
	@echo "$(RED)[WARNING]$(RESET) This will drop all database objects!"
	@$(DC) run --rm flyway -configFiles=/flyway/conf/flyway.conf clean

.PHONY: db-setup
db-setup: up db-migrate db-gen ##@DATABASE Full database setup: Docker + Flyway + Prisma
	@echo "$(GREEN)[OK]$(RESET) Database setup complete!"

.PHONY: db-seed
db-seed: ##@DATABASE Seed database with initial data (custom script)
	@echo "$(CYAN)[SEED]$(RESET) Seeding database with initial data..."
	@npm run db:seed
	@echo "$(GREEN)[OK]$(RESET) Database seeded!"

###################################################################################################
## DOCKER
###################################################################################################

.PHONY: up
up: ##@DOCKER Start Docker containers
	@echo "$(CYAN)[DOCKER]$(RESET) Starting containers..."
	@$(DC) up -d --build
	@echo "$(GREEN)[OK]$(RESET) Containers are running!"

.PHONY: down
down: ##@DOCKER Stop Docker containers
	@echo "$(CYAN)[DOCKER]$(RESET) Stopping containers..."
	@$(DC) down
	@echo "$(GREEN)[OK]$(RESET) Containers stopped!"

.PHONY: reset
reset: down up ##@DOCKER Restart Docker containers
	@echo "$(GREEN)[OK]$(RESET) Containers restarted!"

.PHONY: clean
clean: ##@DOCKER Stop containers and remove volumes
	@echo "$(CYAN)[CLEAN]$(RESET) Cleaning up containers and volumes..."
	@$(DC) down -v
	@echo "$(GREEN)[OK]$(RESET) Clean up complete!"

.PHONY: logs
logs: ##@DOCKER View Docker container logs
	@echo "$(CYAN)[LOGS]$(RESET) Fetching container logs..."
	@$(DC) logs -f database flyway
	@echo "$(GREEN)[OK]$(RESET) Logs fetched!"

###################################################################################################
## KEYS / UTIL
###################################################################################################

.PHONY: keys
keys: ##@UTIL Generate RSA key pair and Base64 for JWT (writes to ./keys) [Unix/Git Bash]
	@echo "$(CYAN)[KEYS]$(RESET) Generating RSA keys..."
	@mkdir -p keys
	@openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/private.pem
	@openssl rsa -pubout -in keys/private.pem -out keys/public.pem
	@{ base64 -w0 keys/private.pem 2>/dev/null || base64 keys/private.pem; } > keys/private.b64
	@{ base64 -w0 keys/public.pem  2>/dev/null || base64 keys/public.pem; }  > keys/public.b64
	@echo "$(GREEN)[OK]$(RESET) Keys generated in ./keys (copy to .env as JWT_PRIVATE_KEY_BASE64 / JWT_PUBLIC_KEY_BASE64)"

.PHONY: keys-win
keys-win: ##@UTIL Generate RSA key pair and Base64 for JWT (PowerShell)
	@echo "$(CYAN)[KEYS-WIN]$(RESET) Generating RSA keys with PowerShell..."
	@powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path 'keys' > $null; \
	openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/private.pem; \
	openssl rsa -pubout -in keys/private.pem -out keys/public.pem; \
	[IO.File]::WriteAllText('keys/private.b64',[Convert]::ToBase64String([IO.File]::ReadAllBytes('keys/private.pem'))); \
	[IO.File]::WriteAllText('keys/public.b64',[Convert]::ToBase64String([IO.File]::ReadAllBytes('keys/public.pem')))"
	@echo "$(GREEN)[OK]$(RESET) Keys generated in ./keys"

.PHONY: totp-key
totp-key: ##@UTIL Generate random 32 bytes Base64 for TOTP AES-256-GCM [Unix/Git Bash]
	@head -c 32 /dev/urandom | base64 | tr -d '\n' | tee /tmp/totp_key.b64
	@echo "\n$(GREEN)[OK]$(RESET) TOTP_ENC_KEY_BASE64 written to /tmp/totp_key.b64"

.PHONY: totp-key-win
totp-key-win: ##@UTIL Generate random 32 bytes Base64 for TOTP AES-256-GCM (PowerShell)
	@powershell -NoProfile -Command "[IO.File]::WriteAllText('/tmp/totp_key.b64',[Convert]::ToBase64String((New-Object byte[] 32 | %{[void](New-Object Random).NextBytes($_);$_})))"
	@echo "$(GREEN)[OK]$(RESET) TOTP_ENC_KEY_BASE64 written to /tmp/totp_key.b64"

###################################################################################################
## HELP
###################################################################################################

.PHONY: default
default: help

HELP_FUN = \
	%help; \
	while(<>) { push @{$$help{$$2 // 'options'}}, [$$1, $$3] if /^([a-zA-Z\-]+)\s*:.*\#\#(?:@([a-zA-Z\-]+))?\s(.*)$$/ }; \
	print "usage: make [target]\n\n"; \
	for (sort keys %help) { \
	print "${CYAN}$$_:${RESET}\n"; \
	for (@{$$help{$$_}}) { \
	$$sep = " " x (32 - length $$_->[0]); \
	print "  ${YELLOW}$$_->[0]${RESET}$$sep${GREEN}$$_->[1]${RESET}\n"; \
	}; \
	print "\n"; }

.PHONY: help
help: ##@OTHER Show this help
	@perl -e '$(HELP_FUN)' $(MAKEFILE_LIST)
