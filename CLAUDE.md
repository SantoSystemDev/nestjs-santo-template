# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 backend template with Prisma 7, PostgreSQL 17, and better-auth for authentication. Supports multi-tenancy via organizations.

## Commands

```bash
# Development (starts Docker + Prisma + dev server)
make start

# Build
npm run build

# Tests
npm run test                    # unit tests
npm run test -- --testPathPattern=users  # single test file/module
npm run test:e2e                # e2e tests (Supertest)
npm run test:cov                # coverage

# Lint & Format
npm run format && npm run lint  # or: make lint

# Database (all via Makefile)
make db-gen                     # regenerate Prisma Client after schema changes
make db-studio                  # open Prisma Studio
make db-pull                    # pull DB schema into Prisma
make db-diff                    # SQL diff between DB and schema.prisma
make db-seed                    # seed database with initial data
make db-setup                   # full setup: Docker + auth-gen + db-gen
make auth-gen                   # generate better-auth schema into Prisma

# Docker
make up                         # start Docker containers (detached)
make down                       # stop Docker containers
make reset                      # restart Docker containers
make clean                      # stop containers and remove volumes
make logs                       # tail database container logs

# Utilities
make setup                      # initialize .env from .env.example
make audit                      # run npm audit and fix vulnerabilities
make outdated                   # check for outdated dependencies
make update                     # update dependencies to latest compatible
make keys                       # generate RSA key pair for JWT (Unix/Git Bash)
make totp-key                   # generate random 32 bytes Base64 for TOTP (Unix/Git Bash)
```

## Architecture

- **Module-per-feature**: each feature has its own NestJS module with controller, service, and DTOs
- **Existing modules**: `auth/` (better-auth integration + types), `users/`, `organizations/`, `health/` (health check endpoint), `prisma/` (global), `shared/` (shared DTOs)
- **PrismaModule** (`src/prisma/`): `@Global()` module — available everywhere, no need to import per-module
- **Prisma Client** is generated to `src/generated/prisma/` — never edit manually; regenerate with `make db-gen`
- **Prisma schema** uses plural model names (e.g., `Users`, `Sessions`) with `@@map` to lowercase table names. The `usePlural: true` option is set in better-auth's prisma adapter
- **better-auth** instance lives in `src/lib/auth.ts` outside NestJS DI (uses its own raw PrismaClient with `@prisma/adapter-pg`). Integrated via `AuthModule.forRoot({ auth })` which registers a global deny-by-default guard
- **Dual Prisma pools (architectural decision)**: the project intentionally uses two PrismaClient instances — `src/lib/prisma.ts` (used exclusively by better-auth) and `PrismaService` (used by NestJS DI). This is necessary because better-auth requires a PrismaClient at import time, before NestJS DI bootstraps. Both connect to the same database and access all tables. Application code should always inject `PrismaService`, never import `src/lib/prisma.ts` directly
- **Shared DTOs** in `src/shared/dtos/` — `PaginationQueryDto` and `PaginatedResponseDto<T>` for consistent pagination across modules. Extend `PaginationQueryDto` for module-specific filters
- **Bootstrap** (`src/main.ts`): `bodyParser: false` is required for better-auth compatibility. Swagger available at `/docs` in non-production
- **Body parsing**: NestJS bodyParser is disabled globally; `AuthModule.forRoot()` re-enables JSON and urlencoded parsing (2mb limit) for non-auth routes only

## Key Conventions

- **Auth decorators** (from `@thallesp/nestjs-better-auth`): `@AllowAnonymous()`, `@OptionalAuth()`, `@Roles([...])`, `@OrgRoles([...])`, `@Session()`
- **Validation**: global `ValidationPipe` with `whitelist: true`, `transform: true`, `enableImplicitConversion: true`
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig `paths`). Note: Jest config is inline in `package.json` and does not have `moduleNameMapper` — tests using `@/*` imports may need it added
- **TypeScript**: target ES2023, module resolution `nodenext`, `strictNullChecks: true`
- **Tests**: `.spec.ts` files colocated with source code; e2e tests in `test/`. Coverage excludes modules, DTOs, enums, interfaces, and `main.ts`
- **Style**: single quotes, trailing commas, LF line endings (Prettier). ESLint flat config with `prettier/prettier: error`

## Environment

Copy `.env.example` to `.env`. Required variables:

- `DATABASE_URL` — Postgres connection string (port **5433**, not 5432)
- `BETTER_AUTH_SECRET` — secret for better-auth sessions
- `BETTER_AUTH_URL` — base URL of the app (e.g., `http://localhost:3000`)
- `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` — used by Docker Compose to provision PostgreSQL
