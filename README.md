# nestjs-auth-template

Template backend moderno com NestJS, Prisma, Docker e autenticação via better-auth.

## Sumário

- [Descrição](#descrição)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Configuração](#configuração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Comandos disponíveis](#comandos-disponíveis)
- [Migrations](#migrations)
- [Testes](#testes)
- [Arquitetura](#arquitetura)
- [Autenticação](#autenticação)
- [Documentação da API](#documentação-da-api)
- [Health Check](#health-check)

---

## Descrição

Template para aplicações backend escaláveis com NestJS 11, pronto para uso em ambientes de desenvolvimento e produção. Inclui autenticação completa via better-auth, ORM com Prisma, documentação automática com Swagger e health check com Terminus.

## Stack

| Tecnologia        | Versão | Função                              |
| ----------------- | ------ | ----------------------------------- |
| NestJS            | 11     | Framework principal                 |
| TypeScript        | 5.7    | Linguagem                           |
| Prisma            | 7      | ORM / geração do client             |
| PostgreSQL        | 17     | Banco de dados relacional           |
| better-auth       | 1.5    | Autenticação (sessões, OAuth, orgs) |
| Swagger (OpenAPI) | 11     | Documentação interativa da API      |
| Docker Compose    | —      | Ambiente local de desenvolvimento   |

## Requisitos

- Node.js 22+
- Docker e Docker Compose

## Configuração

### 1. Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha os valores:

```bash
cp .env.example .env
# ou
make setup
```

### 2. Setup completo (recomendado)

```bash
npm install
make start
```

O `make start` sobe o PostgreSQL via Docker Compose, gera o Prisma Client e inicia a aplicação em modo desenvolvimento — tudo em um único comando.

A aplicação estará disponível em `http://localhost:3000`.

### Setup manual

```bash
docker compose up -d --build
npx prisma generate
npm run start:dev
```

## Variáveis de ambiente

| Variável             | Descrição                                | Exemplo                                        |
| -------------------- | ---------------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`       | Connection string do PostgreSQL          | `postgresql://user:pass@localhost:5433/dbname` |
| `BETTER_AUTH_SECRET` | Secret para assinatura das sessões       | dummy                                          |
| `BETTER_AUTH_URL`    | URL base da aplicação                    | `http://localhost:3000`                        |
| `PORT`               | Porta HTTP da aplicação (padrão: `3000`) | `3000`                                         |

> **Atenção:** A porta exposta pelo Docker Compose para o PostgreSQL é `5433` (mapeada para `5432` internamente).

## Comandos disponíveis

O projeto tem um `Makefile` com os principais atalhos. Para ver todos os targets disponíveis:

```bash
make help
```

Os mais usados:

| Comando          | Descrição                                          |
| ---------------- | -------------------------------------------------- |
| `make start`     | Setup completo (Docker + Prisma) e `start:dev`     |
| `make build`     | Build de produção                                  |
| `make test`      | Testes unitários e e2e                             |
| `make cov`       | Testes unitários com coverage                      |
| `make lint`      | Format + lint                                      |
| `make db-setup`  | Sobe Docker e gera Prisma Client                   |
| `make db-studio` | Abre o Prisma Studio                               |
| `make logs`      | Acompanha os logs do container do banco            |
| `make clean`     | Para os containers e remove volumes (apaga dados!) |

## Migrations

O **Prisma** é usado como ORM e para geração do client. As migrations são gerenciadas diretamente via Prisma.

```bash
# Gerar o Prisma Client após alterações no schema
npx prisma generate

# Inspecionar o banco de dados existente (pull do schema)
npx prisma db pull

# Ver diff entre o banco e o schema.prisma
make db-diff
```

## Testes

```bash
# Testes unitários
npm run test

# Testes unitários em modo watch
npm run test:watch

# Cobertura de testes
npm run test:cov

# Testes e2e
npm run test:e2e
```

Os testes unitários ficam em arquivos `.spec.ts` ao lado do código-fonte. Os testes e2e ficam em `test/`.

## Arquitetura

O projeto segue a arquitetura modular do NestJS, com separação por responsabilidade:

```
src/
├── shared/
│   └── dtos/        # DTOs globais reutilizáveis (paginação, etc.)
├── health/          # Módulo de health check (Terminus)
├── generated/       # Prisma Client gerado (não editar manualmente)
└── main.ts          # Bootstrap da aplicação
```

**Convenções:**

- Cada feature é encapsulada em um **module** NestJS com seus controllers, services e providers
- Validação de entrada via `class-validator` e `class-transformer` com `ValidationPipe` global:
  - `whitelist: true` — campos não declarados no DTO são ignorados silenciosamente
  - `transform: true` — habilita conversão automática de tipos via `class-transformer`
  - `enableImplicitConversion: true` — converte query params pelo tipo TypeScript (ex: `"1"` → `number`)

## DTOs compartilhados

Em `src/shared/dtos/` ficam os DTOs reutilizáveis entre módulos.

### Paginação

`PaginationQueryDto` — query params padrão para listagens:

```
GET /recursos?page=1&size=20&orderBy=createdAt&direction=desc
GET /recursos?page=1&size=20&orderBy=name&orderBy=createdAt&direction=asc&direction=desc
```

`PaginatedResponseDto<T>` — envelope padrão de resposta paginada:

```json
{
  "content": [],
  "currentPage": 1,
  "totalItemsPerPage": 20,
  "totalItems": 100,
  "totalPages": 5
}
```

Para adicionar filtros específicos ao módulo, estenda `PaginationQueryDto`:

```typescript
import { PaginationQueryDto } from '@/shared/dtos';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;
}
```

## Autenticação

A autenticação é gerenciada pelo **better-auth** via o adapter `@thallesp/nestjs-better-auth`.

Recursos incluídos no schema:

- **Users** e **Sessions** — autenticação baseada em sessão
- **Accounts** — suporte a múltiplos providers (OAuth, credenciais)
- **Organizations**, **Members** e **Invitations** — multi-tenancy por organização
- **Verifications** — verificação de e-mail e outros fluxos

As rotas de autenticação são expostas automaticamente pelo better-auth. Consulte a [documentação do better-auth](https://better-auth.com) para detalhes sobre os endpoints disponíveis.

## Documentação da API

A documentação Swagger (OpenAPI) está disponível em ambiente não-produção:

```
http://localhost:3000/docs
```

A spec em JSON está disponível em `/docs-json`.

## Health Check

Endpoint de saúde da aplicação:

```
GET /health
```

Verifica os seguintes indicadores:

- **memory_heap** — uso de heap abaixo de 150 MB
- **storage** — uso de disco abaixo de 90%

Retorna `{ "status": "ok" }` quando todos os indicadores estão saudáveis, ou `{ "status": "error" }` caso contrário.
