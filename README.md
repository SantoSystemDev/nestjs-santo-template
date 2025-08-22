# nestjs-santo-template

Template backend moderno com NestJS, Prisma, Docker e arquitetura Hexagonal.

## Sumário

- Descrição
- Requisitos
- Configuração
- Comandos principais
- Seed do banco
- Testes
- Arquitetura
- Segurança
- CI/CD
- Observabilidade
- Licença

## Descrição

Template para aplicações backend escaláveis, com boas práticas, testes, documentação automática e pronta para produção.

## Requisitos

- Node.js 22+
- Docker e Docker Compose (para banco local)

## Configuração

1. Copie o arquivo `.env.example` para `.env` e ajuste as variáveis.
2. Suba o banco de dados local:

```bash
docker-compose up -d
```

3. Instale as dependências:

```bash
npm install
```

4. Comandos principais

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Testes unitários
npm run test

# Cobertura de testes
npm run test:cov

# Lint e format
npm run lint
npm run format

# Migrations Prisma
npm run migrate:dev

# Seed do banco
npm run db:seed
```

## Seed do banco

O seed inicial está em `seed.ts`. Edite conforme necessário e rode:

```bash
npm run db:seed
```

## Testes

- Testes unitários: arquivos `.spec.ts`.
- Cobertura: `npm run test:cov`.
- (Sugestão) Adicione testes e2e em `test/`.

## Arquitetura

- Modular, baseada em DDD e Hexagonal.
- Separação clara entre domínio, aplicação, infraestrutura e apresentação.
- Prisma como ORM.
- Documentação automática com Swagger (`/api`).

## Segurança

- Validação global de DTOs.
- CORS habilitado (ajuste para produção).
- JWT para autenticação.
- Helmet para proteção de headers HTTP.
- Rate limiting com Throttler (limite de 30 req/min por IP).

## CI/CD

- (Sugestão) Adicione workflow de CI em `ci.yml` para rodar testes e lint.

## Observabilidade

- Health check com Terminus (`/v1/health`).
- (Sugestão) Integre Prometheus ou outra ferramenta para métricas.

## Licença

MIT
