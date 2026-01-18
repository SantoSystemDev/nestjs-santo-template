# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Template NestJS com TypeORM/Prisma, Docker, Flyway migrations e Arquitetura Hexagonal. Stack principal: NestJS 11, Prisma, PostgreSQL, JWT (RS256), Argon2, Pino logger.

## Essential Commands

O projeto utiliza **Makefile** para padronizar comandos. Sempre verifique o Makefile antes de sugerir comandos isolados.

### Development Workflow

```bash
# Setup inicial completo (cria .env, sobe Docker, roda migrations, gera Prisma client)
make db-setup

# Desenvolvimento
make start              # Start em modo watch (equivalente a npm run start:dev)

# Build e qualidade
make build              # Build da aplicação
make lint               # Format + lint (prettier + eslint)
npm run check           # Format + lint + type checking (sem emitir JS)

# Testes
make test               # Testes unitários
make cov                # Testes com cobertura
make e2e                # Testes E2E (Supertest)
```

### Database Management

O projeto usa **Flyway** para migrations (SQL puro em `flyway/migrations/`) e **Prisma** apenas como query builder/client.

```bash
# Aplicar migrations
make db-migrate         # Roda Flyway via Docker

# Flyway utils
make db-info            # Status das migrations
make db-validate        # Valida migrations

# Prisma
make db-gen             # Gera Prisma client após mudanças no schema.prisma
make db-pull            # Sincroniza schema.prisma com DB atual (reverso)
make db-diff            # Gera SQL diff (DB -> schema.prisma) para rascunho de migration
make db-studio          # Abre Prisma Studio

# Seed
make db-seed            # Roda script scripts/seed.ts
```

**IMPORTANTE**: Mudanças de schema devem ser feitas via Flyway migrations SQL (`flyway/migrations/`). O Prisma schema é atualizado via `make db-pull` após aplicar a migration.

### Docker

```bash
make up                 # Sobe containers (postgres + flyway)
make down               # Para containers
make reset              # Reinicia containers
make clean              # Para e remove volumes (CUIDADO: apaga dados)
make logs               # Logs do database e flyway
```

### Security Keys

```bash
make keys               # Gera par RSA + Base64 para JWT (Unix/Git Bash)
make keys-win           # Gera par RSA + Base64 para JWT (PowerShell)
make totp-key           # Gera chave AES-256-GCM para TOTP (Unix/Git Bash)
make totp-key-win       # Gera chave AES-256-GCM para TOTP (PowerShell)
```

## Architecture

### Hexagonal Architecture (Ports & Adapters)

Cada módulo funcional (auth, user) segue a estrutura:

```
modules/
  <module>/
    domain/          # Entidades, interfaces de repositório, modelos de negócio
    application/     # Use cases, DTOs, services (orquestração)
    infra/           # Implementações de repositórios, adapters (Prisma, strategies, guards)
    presentation/    # Controllers, middlewares, exception handlers
    <module>.module.ts
```

**Regras**:

- `domain/` não depende de infraestrutura ou framework
- `application/` depende de `domain/`, mas não de `infra/` (usa interfaces)
- `infra/` implementa interfaces de `domain/`
- `presentation/` depende de `application/` e `infra/`

### Shared Layer

```
shared/
  database/        # Prisma client factory, abstract repositories
  decorators/      # Custom decorators (@CurrentUser, @Normalize)
  errors/          # Custom exceptions (AppException, ValidationException, etc)
  filters/         # Global exception filters
  interceptors/    # Global interceptors (logging, response transform)
  utils/           # Crypto, validators, helpers
```

### Key Modules

- **auth**: Signup, login, logout, refresh token (JWT RS256 com Passport)
  - Strategies: `PasswordStrategy` (local), `JwtStrategy` (Bearer)
  - Guards: `PasswordAuthGuard`, `JwtAuthGuard`
- **user**: CRUD de usuários, roles, normalização de dados
- **health**: Health checks (Terminus) em `/v1/health`

## Database Models

- **User**: fullName, email, passwordHash (Argon2), avatarUrl, phoneNumber, isActive, emailVerified
- **UserRole**: roles do usuário (relação 1:N, unique constraint em userId+name)
- **RefreshToken**: JTI, tokenHash, deviceId, ipAddress, userAgent, expiresAt, revokedAt, replacedByJti

## Environment Variables

Variáveis críticas no `.env` (copiar de `.env.example`):

- `DATABASE_URL`: postgresql://user:pass@host:port/db
- `JWT_PRIVATE_KEY_BASE64` / `JWT_PUBLIC_KEY_BASE64`: Par RSA em Base64 (gerar com `make keys`)
- `PASSWORD_PEPPER`: Pepper para Argon2
- `CORS_ORIGINS`: Origens permitidas (ex: http://localhost:5173)
- `RATE_LIMIT_TTL` / `RATE_LIMIT_LIMIT`: Throttler config

## Testing

- Testes unitários: `*.spec.ts` ao lado do código
- Testes E2E: `test/` (Supertest)
- Coverage: `make cov` (gera relatório em `coverage/`)

## Security & Validation

- **Global Validation Pipe**: DTOs validados com `class-validator`
- **JWT**: RS256, tokens em httpOnly cookies
- **Passwords**: Argon2 com pepper
- **CORS**: Configurável via `CORS_ORIGINS`
- **Rate Limiting**: Throttler (30 req/min por IP padrão)
- **Helmet**: Headers HTTP seguros

## API Documentation

Swagger disponível em `/api` (desenvolvimento). Gerado automaticamente via decorators NestJS.

## Logging

- Pino logger (JSON structured logs)
- Levels: trace, debug, info, warn, error, fatal
- Config via `LOG_LEVEL` (padrão: debug em dev)

## Common Patterns

### Criando um novo módulo

1. Crie estrutura hexagonal: `domain/`, `application/`, `infra/`, `presentation/`
2. Defina entidades/interfaces em `domain/`
3. Implemente use cases em `application/services/`
4. Crie repositórios concretos em `infra/repositories/` (estendendo `PrismaRepository`)
5. Adicione controllers em `presentation/controllers/`
6. Registre providers no `<module>.module.ts`

### Adicionando uma migration

1. Escreva SQL em `flyway/migrations/V<version>__<description>.sql`
2. Rode `make db-migrate`
3. Atualize schema Prisma: `make db-pull`
4. Gere client Prisma: `make db-gen`

### Normalizando dados

Use decorators `@Normalize()` em DTOs para aplicar transformações automáticas (trim, capitalize, lowercase, etc). Veja `shared/decorators/normalize.decorator.ts`.

## Important Notes

- **Sempre rode `make lint` ou `npm run check` antes de commitar**
- **Validar mudanças com testes**: `make test` deve passar
- **Flyway é source of truth para schema**: não use `prisma migrate`, apenas `prisma db pull`
- **Evite lógica complexa em controllers**: use services em `application/`
- **Respeite camadas**: domain não depende de infra, application não depende de implementações concretas
