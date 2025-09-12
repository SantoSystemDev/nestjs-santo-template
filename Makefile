#!make
SHELL := /bin/bash

###################################################################################################
## INIT
###################################################################################################

## PROJECT VARS
PROJECT_NAME := $(shell basename $(CURDIR))

## Colors for visual feedback
RED := $(shell tput -Txterm setaf 1)
GREEN := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
CYAN := $(shell tput -Txterm setaf 6)
WHITE := $(shell tput -Txterm setaf 7)
RESET := $(shell tput -Txterm sgr0)

.PHONY: setup
setup: ##@INIT Initialize environment configuration
	@echo "$(CYAN)[ENV]$(RESET) Setting up environment for $(PROJECT_NAME)..."
	@cp .env.example .env || echo "$(YELLOW).env already exists, skipping...$(RESET)"
	@echo "$(GREEN)[OK]$(RESET) Setup complete!"

###################################################################################################
## NESTJS COMMANDS
###################################################################################################

.PHONY: start
start: ##@NESTJS Start the application in development mode
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

###################################################################################################
## DATABASE COMMANDS
###################################################################################################

.PHONY: gen
gen: ##@PRISMA Generate Prisma client
	@echo "$(CYAN)[PRISMA]$(RESET) Generating Prisma client..."
	@npm run generate
	@echo "$(GREEN)[OK]$(RESET) Prisma client generated!"

.PHONY: studio
studio: ##@PRISMA Open Prisma Studio
	@echo "$(CYAN)[PRISMA]$(RESET) Opening Prisma Studio..."
	@npm run studio

.PHONY: db-setup
db-setup: up gen ##@DATABASE Full database setup: Docker + Flyway + Prisma
  @echo "$(GREEN)[OK]$(RESET) Database setup complete!"

###################################################################################################
## DOCKER COMMANDS
###################################################################################################

.PHONY: up
up: ##@DOCKER Start Docker containers
	@echo "$(CYAN)[DOCKER]$(RESET) Starting containers..."
	@docker-compose up -d --build
	@echo "$(GREEN)[OK]$(RESET) Containers are running!"

.PHONY: down
down: ##@DOCKER Stop Docker containers
	@echo "$(CYAN)[DOCKER]$(RESET) Stopping containers..."
	@docker-compose down
	@echo "$(GREEN)[OK]$(RESET) Containers stopped!"

.PHONY: reset
reset: down up ##@DOCKER Restart Docker containers

.PHONY: clean
clean: ##@DOCKER Stop containers and remove volumes
	@echo "$(CYAN)[CLEAN]$(RESET) Cleaning up containers and volumes..."
	@docker-compose down -v
	@echo "$(GREEN)[OK]$(RESET) Clean up complete!"

.PHONY: logs
logs: ##@DOCKER View Docker container logs
  @echo "$(CYAN)[LOGS]$(RESET) Fetching container logs..."
  @docker-compose logs -f app
  @echo "$(GREEN)[OK]$(RESET) Logs fetched!"

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
