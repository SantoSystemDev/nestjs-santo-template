# Plano de Ação: Sistema de Autenticação e Autorização Completo

**Fonte:** `.claude/documents/PRD-auth.md`
**Jira:** N/A
**Feature:** `auth`

---

## 1) Objetivo do plano

Evoluir o sistema de autenticação básico existente (signup/login JWT) para um sistema completo e robusto com:

- Refresh tokens com rotação automática
- Validação de email pós-cadastro
- Recuperação de senha via email
- Bloqueio automático de conta após tentativas falhas
- Multi-tenancy (organizações) com isolamento de dados
- Roles e permissões (`USER`, `SUPER_ADMIN`)
- Proteções contra ataques (rate limiting, mensagens genéricas)
- Cleanup automático de tokens expirados
- Auditoria completa de tentativas de login

---

## 2) Premissas / decisões já tomadas (do PRD)

### Implementado (precisa ser revisto/melhorado):
- Signup básico com email/senha
- Login com Passport (PasswordAuthGuard)
- JWT RS256 com access token retornado em JSON (mudar para cookie httpOnly)
- Argon2 + pepper para hash de senhas
- Modelo `RefreshToken` existe mas não está sendo usado
- Guards: `JwtAuthGuard`, `PasswordAuthGuard`
- Role `USER` atribuída automaticamente no signup

### Decisões técnicas do PRD:
- Access token: 15min de validade (cookie httpOnly)
- Refresh token: 7 dias de validade (cookie httpOnly, rotação obrigatória a cada uso)
- Limite: 10 refresh tokens ativos por usuário (remover mais antigos)
- Email de confirmação: expira em 24h
- Email de recuperação de senha: expira em 1h
- Bloqueio de conta: 5 tentativas em 15min → bloqueia por 30min
- Rate limiting auth endpoints: 5 req/min por IP
- SMTP: Nodemailer com config via env vars
- Cleanup job: diário às 03:00 UTC (remove tokens expirados)
- Timestamps: sempre UTC
- Mensagens de erro: genéricas (não vazar se email existe)
- `SUPER_ADMIN` inicial: Anderson Santo (seed script)

---

## 3) Arquitetura do projeto (checagem rápida)

### Padrão identificado:
**Arquitetura Hexagonal (Ports & Adapters)** com separação em camadas:
- `domain/`: entidades, interfaces de repositório, modelos de negócio
- `application/`: use cases, DTOs, services (orquestração)
- `infra/`: implementações de repositórios, adapters (Prisma, strategies, guards)
- `presentation/`: controllers, middlewares, exception handlers

### Onde foi identificado:
- `CLAUDE.md` (seção "Architecture")
- Estrutura de pastas em `src/modules/auth/`, `src/modules/user/`
- Código existente respeita camadas (domain não depende de infra)

### Regras/padrões relevantes que NÃO podem ser quebrados:
- Domain não pode depender de infraestrutura ou framework
- Application depende de domain via interfaces (ports), não de implementações concretas
- Infra implementa interfaces de domain
- Presentation depende de application e infra
- Flyway é source of truth para schema (não usar `prisma migrate`)
- Prisma é apenas query builder/client
- Migrations em SQL puro (`flyway/migrations/V*.sql`)
- Após migration: rodar `make db-pull` e `make db-gen`

### Guard rails (o que evitar):
- Não criar migrations via Prisma CLI
- Não adicionar lógica de negócio em controllers (usar services em application)
- Não expor detalhes de implementação em DTOs (manter contratos agnósticos)
- Não adicionar dependências diretas de Prisma em domain/application (usar interfaces)
- Não quebrar isolamento de camadas
- Não adicionar comentários desnecessários no código
- Não criar arquivos README.md ou documentação desnecessária (apenas mudanças críticas)

### Impacto previsto desta tarefa na arquitetura:
**Módulos/camadas afetadas:**
- `src/modules/auth/` (todas as camadas: domain, application, infra, presentation)
- `src/modules/user/` (domain, infra para multi-tenancy)
- `src/shared/` (novos decorators, interceptors, guards para multi-tenancy)
- `flyway/migrations/` (novas migrations para Organization, LoginAttempt, campos em User)
- `prisma/schema.prisma` (atualizado via `db-pull` após migrations)

**Novos componentes:**
- `src/modules/auth/infra/services/email.service.ts` (envio de emails via Nodemailer)
- `src/modules/auth/infra/services/token-cleanup.service.ts` (cron job)
- `src/modules/auth/infra/repositories/refresh-token.repository.ts` (CRUD de refresh tokens)
- `src/modules/auth/infra/repositories/login-attempt.repository.ts` (auditoria)
- `src/modules/auth/templates/` (templates HTML de emails)
- `src/shared/guards/organization.guard.ts` (isolamento multi-tenancy)
- `src/shared/interceptors/organization.interceptor.ts` (filtro automático por organizationId)

---

## 4) Modelagem de dados (somente modelagem, sem scripts)

### 4.1) Entidade/Tabela: `Organization` (NOVA)

**Campos:**
- `id`: UUID, PK
- `name`: VARCHAR(255), NOT NULL
- `slug`: VARCHAR(100), NOT NULL, UNIQUE
- `is_active`: BOOLEAN, NOT NULL, DEFAULT true
- `created_at`: TIMESTAMP, NOT NULL, DEFAULT NOW()
- `updated_at`: TIMESTAMP, NOT NULL, DEFAULT NOW()

**Chaves:**
- PK: `id`

**Índices/Constraints:**
- UNIQUE: `slug`
- INDEX: `is_active`

**Regras de integridade / invariantes:**
- `slug` deve ser único globalmente
- `slug` deve ser gerado automaticamente a partir de `name` (normalização: lowercase, hífens)
- `is_active` controla se organização está ativa (soft delete)

**Migração esperada (alto nível):**
- Adicionar tabela `organizations`
- Backfill: criar organização "default" para usuários existentes (se houver)
- Risco: baixo (tabela nova, sem dependências iniciais)

---

### 4.2) Entidade/Tabela: `User` (ALTERAR)

**Campos novos:**
- `organization_id`: UUID, NULLABLE, FK para `organizations.id`
- `login_attempts`: INTEGER, NOT NULL, DEFAULT 0
- `locked_until`: TIMESTAMP, NULLABLE
- `is_locked`: BOOLEAN, NOT NULL, DEFAULT false

**Chaves:**
- FK: `organization_id` → `organizations.id` (ON DELETE SET NULL)

**Índices/Constraints:**
- INDEX: `organization_id`
- INDEX: `email, organization_id` (queries comuns)
- INDEX: `is_locked, locked_until` (queries de bloqueio)

**Regras de integridade / invariantes:**
- `organization_id` é `NULL` apenas para `SUPER_ADMIN`
- `is_locked = true` quando `login_attempts >= 5` em 15min
- `locked_until` é timestamp UTC de desbloqueio automático (30min após bloqueio)
- `login_attempts` é resetado após login bem-sucedido
- Se `locked_until < NOW()`, desbloqueio automático ocorre (`is_locked = false`)

**Migração esperada (alto nível):**
- Adicionar colunas `organization_id`, `login_attempts`, `locked_until`, `is_locked`
- Backfill: `organization_id = default_org_id` para usuários existentes (exceto `SUPER_ADMIN`)
- Risco: médio (altera tabela central, precisa backfill cuidadoso)

---

### 4.3) Entidade/Tabela: `RefreshToken` (GARANTIR CAMPOS)

**Campos existentes (já no schema):**
- `id`: UUID, PK
- `user_id`: UUID, NOT NULL, FK para `users.id`
- `jti`: VARCHAR(255), NOT NULL, UNIQUE
- `token_hash`: VARCHAR(255), NOT NULL
- `device_id`: VARCHAR(255), NULLABLE
- `ip_address`: VARCHAR(45), NULLABLE
- `user_agent`: TEXT, NULLABLE
- `expires_at`: TIMESTAMP, NOT NULL
- `revoked_at`: TIMESTAMP, NULLABLE
- `revoked_reason`: VARCHAR(100), NULLABLE
- `replaced_by_jti`: VARCHAR(255), NULLABLE
- `created_at`: TIMESTAMP, NOT NULL, DEFAULT NOW()
- `updated_at`: TIMESTAMP, NOT NULL, DEFAULT NOW()

**Chaves:**
- PK: `id`
- FK: `user_id` → `users.id` (ON DELETE CASCADE)

**Índices/Constraints:**
- UNIQUE: `jti`
- INDEX: `user_id, expires_at` (já existe no schema)
- INDEX: `revoked_at` (novo, para cleanup job)
- INDEX: `expires_at` (novo, para cleanup job)

**Regras de integridade / invariantes:**
- `jti` é único globalmente (identificador do token)
- `token_hash` é SHA256 do refresh token (não armazenar plaintext)
- `revoked_at` marca token como inválido (não pode ser usado)
- `replaced_by_jti` aponta para o novo JTI quando token é rotacionado
- `revoked_reason` pode ser: `'user_logout'`, `'token_rotation'`, `'password_reset'`, `'token_reuse_detected'`, `'expired'`
- Máximo de 10 tokens ativos por `user_id` (remover mais antigos automaticamente)

**Migração esperada (alto nível):**
- Tabela já existe no schema
- Adicionar índices em `revoked_at` e `expires_at` se não existirem
- Risco: baixo (apenas novos índices)

---

### 4.4) Entidade/Tabela: `LoginAttempt` (NOVA)

**Campos:**
- `id`: UUID, PK
- `email`: VARCHAR(255), NOT NULL
- `user_id`: UUID, NULLABLE, FK para `users.id`
- `ip_address`: VARCHAR(45), NOT NULL
- `user_agent`: TEXT, NULLABLE
- `success`: BOOLEAN, NOT NULL
- `failure_reason`: VARCHAR(255), NULLABLE
- `timestamp`: TIMESTAMP, NOT NULL, DEFAULT NOW()

**Chaves:**
- PK: `id`
- FK: `user_id` → `users.id` (ON DELETE SET NULL)

**Índices/Constraints:**
- INDEX: `email, timestamp` (queries de bloqueio)
- INDEX: `user_id, timestamp` (auditoria por usuário)
- INDEX: `ip_address, timestamp` (detecção de ataques)
- INDEX: `timestamp` (cleanup job)

**Regras de integridade / invariantes:**
- `user_id` é `NULL` se email não existir no sistema (tentativa de login com email inexistente)
- `success = true` indica login bem-sucedido
- `success = false` indica falha (verificar `failure_reason`)
- `failure_reason` pode ser: `'invalid_password'`, `'email_not_verified'`, `'account_locked'`, `'account_inactive'`, `'email_not_found'`
- Registros > 60 dias são removidos pelo cleanup job

**Migração esperada (alto nível):**
- Adicionar tabela `login_attempts`
- Backfill: não necessário (tabela de auditoria, começa vazia)
- Risco: baixo (tabela nova, independente)

---

## 5) Contratos (somente se necessário)

### 5.1) Endpoints API (novos/alterados)

#### `POST /v1/auth/signup` (ALTERAR)
**Input DTO:**
```
SignupDto {
  email: string (required, valid email)
  password: string (required, min 8 chars, 1 letra, 1 número, 1 especial)
  fullName: string (required, min 2 chars)
  organizationId?: string (optional UUID, obrigatório se não for SUPER_ADMIN)
}
```
**Output:**
```
{
  message: string
  userId: string
}
```
**Cookies:** Nenhum (usuário precisa validar email)

#### `POST /v1/auth/login` (ALTERAR)
**Input DTO:**
```
LoginDto {
  email: string (required, valid email)
  password: string (required)
}
```
**Output:**
```
{
  accessToken: string
  user: {
    id: string
    email: string
    fullName: string
    roles: string[]
    organizationId?: string
  }
}
```
**Cookies:** `refreshToken` (httpOnly, secure, sameSite: strict, maxAge: 7 days)

#### `POST /v1/auth/refresh` (NOVO)
**Input:** Cookie `refreshToken`
**Output:**
```
{
  accessToken: string
}
```
**Cookies:** `refreshToken` (novo, rotacionado)

#### `POST /v1/auth/logout` (NOVO)
**Input:** Cookie `refreshToken`
**Output:**
```
{
  message: string
}
```
**Cookies:** Removidos

#### `POST /v1/auth/verify-email` (NOVO)
**Input DTO:**
```
VerifyEmailDto {
  token: string (required, JWT)
}
```
**Output:**
```
{
  message: string
}
```

#### `POST /v1/auth/resend-verification` (NOVO)
**Input DTO:**
```
ResendVerificationDto {
  email: string (required, valid email)
}
```
**Output:**
```
{
  message: string
}
```

#### `POST /v1/auth/forgot-password` (NOVO)
**Input DTO:**
```
ForgotPasswordDto {
  email: string (required, valid email)
}
```
**Output:**
```
{
  message: string
}
```

#### `POST /v1/auth/reset-password` (NOVO)
**Input DTO:**
```
ResetPasswordDto {
  token: string (required, JWT)
  newPassword: string (required, mesmos critérios do signup)
}
```
**Output:**
```
{
  message: string
}
```

---

### 5.2) Interfaces de domínio (ports)

#### `RefreshTokenRepositoryPort` (NOVO)
```
interface RefreshTokenRepositoryPort {
  create(data: CreateRefreshTokenDto): Promise<RefreshToken>
  findByJti(jti: string): Promise<RefreshToken | null>
  findActiveByUserId(userId: string): Promise<RefreshToken[]>
  revoke(jti: string, reason: string, replacedByJti?: string): Promise<void>
  revokeAllByUserId(userId: string, reason: string): Promise<void>
  removeOldest(userId: string, limit: number): Promise<void>
  deleteExpired(): Promise<number>
}
```

#### `LoginAttemptRepositoryPort` (NOVO)
```
interface LoginAttemptRepositoryPort {
  create(data: CreateLoginAttemptDto): Promise<LoginAttempt>
  countRecentFailures(email: string, minutesAgo: number): Promise<number>
  deleteOlderThan(days: number): Promise<number>
}
```

#### `OrganizationRepositoryPort` (NOVO)
```
interface OrganizationRepositoryPort {
  create(data: CreateOrganizationDto): Promise<Organization>
  findById(id: string): Promise<Organization | null>
  findBySlug(slug: string): Promise<Organization | null>
  findAll(filters?: OrganizationFilters): Promise<Organization[]>
  update(id: string, data: UpdateOrganizationDto): Promise<Organization>
}
```

#### `EmailServicePort` (NOVO)
```
interface EmailServicePort {
  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendAccountLockedEmail(to: string, unlockTime: Date): Promise<void>
  sendPasswordChangedEmail(to: string): Promise<void>
}
```

---

### 5.3) DTOs de aplicação (novos)

```
VerifyEmailDto { token: string }
ResendVerificationDto { email: string }
ForgotPasswordDto { email: string }
ResetPasswordDto { token: string; newPassword: string }
CreateRefreshTokenDto { userId, jti, tokenHash, deviceId?, ipAddress?, userAgent?, expiresAt }
CreateLoginAttemptDto { email, userId?, ipAddress, userAgent?, success, failureReason? }
CreateOrganizationDto { name, slug?, isActive? }
UpdateOrganizationDto { name?, slug?, isActive? }
```

---

### 5.4) Modelos de domínio (novos/alterados)

```
OrganizationModel {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

RefreshTokenModel {
  id: string
  userId: string
  jti: string
  tokenHash: string
  deviceId?: string
  ipAddress?: string
  userAgent?: string
  expiresAt: Date
  revokedAt?: Date
  revokedReason?: string
  replacedByJti?: string
  createdAt: Date
  updatedAt: Date
}

LoginAttemptModel {
  id: string
  email: string
  userId?: string
  ipAddress: string
  userAgent?: string
  success: boolean
  failureReason?: string
  timestamp: Date
}

JwtPayloadModel (ALTERAR) {
  userId: string
  email: string
  roles: RoleEnum[]
  organizationId?: string // adicionar
}

EmailVerificationPayload {
  userId: string
  type: 'email_verification'
}

PasswordResetPayload {
  userId: string
  type: 'password_reset'
}
```

---

### 5.5) Enums

```
RoleEnum (ALTERAR) {
  USER = 'USER'
  SUPER_ADMIN = 'SUPER_ADMIN' // adicionar
}

TokenTypeEnum {
  EMAIL_VERIFICATION = 'email_verification'
  PASSWORD_RESET = 'password_reset'
}

RevokedReasonEnum {
  USER_LOGOUT = 'user_logout'
  TOKEN_ROTATION = 'token_rotation'
  PASSWORD_RESET = 'password_reset'
  TOKEN_REUSE_DETECTED = 'token_reuse_detected'
  EXPIRED = 'expired'
}

LoginFailureReasonEnum {
  INVALID_PASSWORD = 'invalid_password'
  EMAIL_NOT_VERIFIED = 'email_not_verified'
  ACCOUNT_LOCKED = 'account_locked'
  ACCOUNT_INACTIVE = 'account_inactive'
  EMAIL_NOT_FOUND = 'email_not_found'
}
```

---

## 6) Checklist de execução (passos pequenos e verificáveis)

### Passo 1 — Modelagem de dados e migrations

**Intenção:** Criar estrutura de dados para multi-tenancy, bloqueio de conta e auditoria de login.

**O que vai mudar (alto nível):**
- Adicionar: tabela `organizations`, tabela `login_attempts`, campos em `users` (`organization_id`, `login_attempts`, `locked_until`, `is_locked`), índices em `refresh_tokens`
- Alterar: schema Prisma (via `db-pull` após migrations)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `flyway/migrations/V2__add_organizations.sql`
- `flyway/migrations/V3__add_user_lock_fields.sql`
- `flyway/migrations/V4__add_login_attempts.sql`
- `flyway/migrations/V5__add_refresh_token_indexes.sql`
- `prisma/schema.prisma` (atualizado via `make db-pull`)

**Responsabilidades (funções/métodos):**
- **V2__add_organizations.sql**: criar tabela `organizations` com campos (id, name, slug, is_active, created_at, updated_at), UNIQUE constraint em `slug`, INDEX em `is_active`
- **V3__add_user_lock_fields.sql**: adicionar colunas `organization_id`, `login_attempts`, `locked_until`, `is_locked` em `users`, FK para `organizations`, índices
- **V4__add_login_attempts.sql**: criar tabela `login_attempts` com campos (id, email, user_id, ip_address, user_agent, success, failure_reason, timestamp), índices
- **V5__add_refresh_token_indexes.sql**: adicionar índices em `refresh_tokens.revoked_at` e `refresh_tokens.expires_at`

**Arquitetura (impacto/restrição):**
Flyway é source of truth para schema (CLAUDE.md seção "Database Management"). Não usar `prisma migrate`.

**Dados (impacto):**
Adiciona 2 tabelas novas (`organizations`, `login_attempts`) e 4 campos em `users`. Requer backfill de `organization_id` para usuários existentes (criar organização "default" se necessário).

**Evidência/Verificação:**
```bash
make db-migrate      # Aplicar migrations
make db-info         # Verificar status das migrations
make db-pull         # Sincronizar schema.prisma
make db-gen          # Gerar Prisma client
```

**Critério de pronto:**
- [ ] Migrations aplicadas com sucesso (sem erros no Flyway)
- [ ] Tabelas `organizations` e `login_attempts` criadas no banco
- [ ] Campos novos em `users` existem
- [ ] Índices criados em `refresh_tokens`
- [ ] `schema.prisma` reflete mudanças
- [ ] Prisma client gerado sem erros

---

### Passo 2 — Domain layer: modelos, enums e interfaces (ports)

**Intenção:** Definir contratos e modelos de domínio para novas funcionalidades (multi-tenancy, refresh tokens, auditoria).

**O que vai mudar (alto nível):**
- Adicionar: modelos de domínio (`OrganizationModel`, `RefreshTokenModel`, `LoginAttemptModel`), enums (`RoleEnum.SUPER_ADMIN`, `TokenTypeEnum`, `RevokedReasonEnum`, `LoginFailureReasonEnum`), interfaces de repositório (`RefreshTokenRepositoryPort`, `LoginAttemptRepositoryPort`, `OrganizationRepositoryPort`, `EmailServicePort`)
- Alterar: `JwtPayloadModel` (adicionar `organizationId`)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/domain/models/organization.model.ts`
- `src/modules/auth/domain/models/refresh-token.model.ts`
- `src/modules/auth/domain/models/login-attempt.model.ts`
- `src/modules/auth/domain/models/jwt-payload.model.ts` (alterar)
- `src/modules/auth/domain/models/email-verification-payload.model.ts`
- `src/modules/auth/domain/models/password-reset-payload.model.ts`
- `src/modules/auth/domain/enums/token-type.enum.ts`
- `src/modules/auth/domain/enums/revoked-reason.enum.ts`
- `src/modules/auth/domain/enums/login-failure-reason.enum.ts`
- `src/modules/auth/domain/ports/refresh-token-repository.port.ts`
- `src/modules/auth/domain/ports/login-attempt-repository.port.ts`
- `src/modules/auth/domain/ports/organization-repository.port.ts`
- `src/modules/auth/domain/ports/email-service.port.ts`
- `src/user/domain/enums/role.enum.ts` (adicionar `SUPER_ADMIN`)

**Responsabilidades (funções/métodos):**
- **OrganizationModel**: representa organização com factory method `create()`, validação de `slug`
- **RefreshTokenModel**: representa refresh token com factory method `create()`, validação de `expiresAt`, `jti`
- **LoginAttemptModel**: representa tentativa de login com factory method `create()`
- **JwtPayloadModel**: adicionar campo `organizationId` (opcional)
- **EmailVerificationPayload**: payload JWT para validação de email (`userId`, `type`)
- **PasswordResetPayload**: payload JWT para reset de senha (`userId`, `type`)
- **RefreshTokenRepositoryPort**: interface com métodos CRUD (seção 5.2)
- **LoginAttemptRepositoryPort**: interface com métodos de criação e contagem (seção 5.2)
- **OrganizationRepositoryPort**: interface com métodos CRUD (seção 5.2)
- **EmailServicePort**: interface com métodos de envio de email (seção 5.2)

**Arquitetura (impacto/restrição):**
Domain não depende de framework ou infra (CLAUDE.md seção "Architecture"). Modelos e interfaces devem ser agnósticos.

**Dados (impacto):**
Não afeta dados (apenas definições TypeScript).

**Evidência/Verificação:**
```bash
npm run check        # Type checking sem emitir JS
```

**Critério de pronto:**
- [ ] Modelos criados com factory methods
- [ ] Enums criados com valores corretos
- [ ] Interfaces (ports) criadas com assinaturas corretas
- [ ] `RoleEnum.SUPER_ADMIN` adicionado
- [ ] `JwtPayloadModel.organizationId` adicionado
- [ ] Type checking passa sem erros

---

### Passo 3 — Infra layer: repositórios concretos para Organization, RefreshToken e LoginAttempt

**Intenção:** Implementar acesso a dados (Prisma) para novas entidades.

**O que vai mudar (alto nível):**
- Adicionar: repositórios concretos (`OrganizationRepository`, `RefreshTokenRepository`, `LoginAttemptRepository`)
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/infra/repositories/organization.repository.ts`
- `src/modules/auth/infra/repositories/refresh-token.repository.ts`
- `src/modules/auth/infra/repositories/login-attempt.repository.ts`
- `src/modules/auth/infra/providers/auth.providers.ts` (registrar novos providers)

**Responsabilidades (funções/métodos):**
- **OrganizationRepository**: implementa `OrganizationRepositoryPort` usando Prisma, métodos: `create()`, `findById()`, `findBySlug()`, `findAll()`, `update()`
- **RefreshTokenRepository**: implementa `RefreshTokenRepositoryPort` usando Prisma, métodos: `create()`, `findByJti()`, `findActiveByUserId()`, `revoke()`, `revokeAllByUserId()`, `removeOldest()`, `deleteExpired()`
- **LoginAttemptRepository**: implementa `LoginAttemptRepositoryPort` usando Prisma, métodos: `create()`, `countRecentFailures()`, `deleteOlderThan()`

**Arquitetura (impacto/restrição):**
Infra implementa interfaces de domain (CLAUDE.md seção "Architecture"). Estender `PrismaRepository` se aplicável.

**Dados (impacto):**
Acesso a `organizations`, `refresh_tokens`, `login_attempts` via Prisma.

**Evidência/Verificação:**
```bash
npm run check        # Type checking
make test            # Testes unitários dos repositórios
```

**Critério de pronto:**
- [ ] Repositórios criados com todos os métodos da interface
- [ ] Providers registrados em `auth.providers.ts`
- [ ] Type checking passa
- [ ] Testes unitários dos repositórios passam (mocks de Prisma)

---

### Passo 4 — Infra layer: EmailService (Nodemailer) e templates HTML

**Intenção:** Implementar envio de emails usando Nodemailer com templates HTML simples.

**O que vai mudar (alto nível):**
- Adicionar: `EmailService` (implementa `EmailServicePort`), templates HTML (`email-verification.html`, `password-reset.html`, `account-locked.html`, `password-changed.html`), config SMTP via env vars
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/infra/services/email.service.ts`
- `src/modules/auth/templates/email-verification.html`
- `src/modules/auth/templates/password-reset.html`
- `src/modules/auth/templates/account-locked.html`
- `src/modules/auth/templates/password-changed.html`
- `src/modules/auth/infra/providers/auth.providers.ts` (registrar EmailService)
- `.env.example` (adicionar variáveis SMTP)

**Responsabilidades (funções/métodos):**
- **EmailService**: implementa `EmailServicePort` usando Nodemailer, métodos: `sendVerificationEmail()`, `sendPasswordResetEmail()`, `sendAccountLockedEmail()`, `sendPasswordChangedEmail()`, método interno `sendEmail()` (genérico), carrega templates HTML e substitui variáveis (ex: `{{name}}`, `{{link}}`)
- **Templates HTML**: HTML responsivo simples, variáveis dinâmicas via placeholders (`{{name}}`, `{{link}}`, `{{unlockTime}}`)

**Arquitetura (impacto/restrição):**
Infra implementa interface de domain (CLAUDE.md seção "Architecture"). Nodemailer é dependência externa (adicionar ao `package.json`).

**Dados (impacto):**
Não afeta dados (apenas envio de emails).

**Evidência/Verificação:**
```bash
npm install nodemailer @types/nodemailer
npm run check        # Type checking
make test            # Testes unitários do EmailService (mocks de Nodemailer)
```

**Critério de pronto:**
- [ ] EmailService criado com todos os métodos
- [ ] Templates HTML criados e funcionais
- [ ] Variáveis SMTP adicionadas ao `.env.example`
- [ ] Nodemailer instalado
- [ ] Provider registrado
- [ ] Type checking passa
- [ ] Testes unitários passam (mocks de envio de email)

---

### Passo 5 — Application layer: DTOs de validação para novos endpoints

**Intenção:** Criar DTOs com validações para endpoints de verificação de email, recuperação de senha, refresh token, logout.

**O que vai mudar (alto nível):**
- Adicionar: DTOs (`VerifyEmailDto`, `ResendVerificationDto`, `ForgotPasswordDto`, `ResetPasswordDto`)
- Alterar: `SignupDto` (adicionar campo `organizationId` opcional), `LoginDto` (garantir validações)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/application/dtos/verify-email.dto.ts`
- `src/modules/auth/application/dtos/resend-verification.dto.ts`
- `src/modules/auth/application/dtos/forgot-password.dto.ts`
- `src/modules/auth/application/dtos/reset-password.dto.ts`
- `src/modules/auth/application/dtos/signup.dto.ts` (alterar)
- `src/modules/auth/application/dtos/login.dto.ts` (garantir validações)

**Responsabilidades (funções/métodos):**
- **VerifyEmailDto**: campo `token` (string, obrigatório, JWT válido)
- **ResendVerificationDto**: campo `email` (string, obrigatório, email válido)
- **ForgotPasswordDto**: campo `email` (string, obrigatório, email válido)
- **ResetPasswordDto**: campos `token` (string, obrigatório, JWT válido), `newPassword` (string, obrigatório, mín 8 chars, 1 letra, 1 número, 1 especial)
- **SignupDto**: adicionar campo `organizationId` (string UUID, opcional, validar se fornecido)
- **LoginDto**: garantir validações de email e senha (obrigatórios)

**Arquitetura (impacto/restrição):**
Application não depende de implementações concretas (CLAUDE.md seção "Architecture"). Usar `class-validator` para validações.

**Dados (impacto):**
Não afeta dados (apenas validações de input).

**Evidência/Verificação:**
```bash
npm run check        # Type checking
make test            # Testes unitários de validação dos DTOs
```

**Critério de pronto:**
- [ ] DTOs criados com decorators `class-validator`
- [ ] Validações corretas (email, senha, UUID)
- [ ] `SignupDto.organizationId` adicionado (opcional)
- [ ] Type checking passa
- [ ] Testes unitários de validação passam

---

### Passo 6 — Application layer: AuthService - signup com validação de email e multi-tenancy

**Intenção:** Evoluir signup para suportar multi-tenancy, enviar email de confirmação, criar conta com `emailVerified: false`.

**O que vai mudar (alto nível):**
- Adicionar: geração de token de verificação de email (JWT), envio de email via `EmailService`, validação de `organizationId`
- Alterar: `signup()` (adicionar lógica de verificação de email, multi-tenancy), criar usuário com `emailVerified: false`
- Remover: emissão de access token imediatamente (apenas retornar mensagem para verificar email)

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/application/services/auth.service.ts` (alterar método `signup()`)

**Responsabilidades (funções/métodos):**
- **AuthService.signup()**: validar se `organizationId` existe (se fornecido), criar usuário com `emailVerified: false`, gerar token de verificação JWT (`EmailVerificationPayload`, expiração 24h), enviar email via `EmailService.sendVerificationEmail()`, retornar mensagem de sucesso com `userId`
- **AuthService.generateEmailVerificationToken()**: gerar JWT com payload `{ userId, type: 'email_verification' }`, expiração 24h

**Arquitetura (impacto/restrição):**
Application depende de interfaces de domain (CLAUDE.md seção "Architecture"). Injetar `EmailServicePort`, `OrganizationRepositoryPort`.

**Dados (impacto):**
Cria usuário com `emailVerified: false`, insere role `USER`.

**Evidência/Verificação:**
```bash
make test            # Testes unitários do AuthService.signup()
```

**Critério de pronto:**
- [ ] `signup()` valida `organizationId` se fornecido
- [ ] Usuário criado com `emailVerified: false`
- [ ] Token de verificação gerado (JWT, 24h)
- [ ] Email de verificação enviado
- [ ] Não retorna access token (apenas mensagem)
- [ ] Testes unitários passam

---

### Passo 7 — Application layer: AuthService - verificação de email e reenvio

**Intenção:** Implementar lógica de validação de email via token JWT e reenvio de email de confirmação.

**O que vai mudar (alto nível):**
- Adicionar: métodos `verifyEmail()`, `resendVerification()`
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/application/services/auth.service.ts` (adicionar métodos)

**Responsabilidades (funções/métodos):**
- **AuthService.verifyEmail()**: validar token JWT (`EmailVerificationPayload`), verificar se usuário existe e ainda não verificou email, atualizar `emailVerified: true`, retornar mensagem de sucesso
- **AuthService.resendVerification()**: buscar usuário por email, verificar se email já foi verificado (não reenviar se já verificado), aplicar rate limit (1 envio a cada 5min por email), gerar novo token de verificação, enviar email via `EmailService.sendVerificationEmail()`, retornar mensagem de sucesso

**Arquitetura (impacto/restrição):**
Application depende de interfaces de domain (CLAUDE.md seção "Architecture"). Injetar `UserRepositoryPort`, `EmailServicePort`.

**Dados (impacto):**
Atualiza `users.email_verified` para `true`.

**Evidência/Verificação:**
```bash
make test            # Testes unitários do AuthService.verifyEmail() e resendVerification()
```

**Critério de pronto:**
- [ ] `verifyEmail()` valida token JWT corretamente
- [ ] `emailVerified` atualizado para `true`
- [ ] `resendVerification()` aplica rate limit (5min)
- [ ] Email reenviado com novo token
- [ ] Testes unitários passam

---

### Passo 8 — Application layer: AuthService - login com verificações (email, bloqueio) e refresh token

**Intenção:** Evoluir login para verificar email validado, conta não bloqueada, emitir access+refresh tokens, registrar tentativa de login, aplicar bloqueio após 5 falhas.

**O que vai mudar (alto nível):**
- Adicionar: verificação de `emailVerified`, `isLocked`, `lockedUntil`, emissão de refresh token, registro de tentativa de login (`LoginAttemptRepository`), lógica de bloqueio de conta (5 falhas em 15min), envio de email de bloqueio
- Alterar: `login()` (adicionar lógicas acima), retornar access token em JSON e refresh token em httpOnly cookie
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/application/services/auth.service.ts` (alterar método `login()`)

**Responsabilidades (funções/métodos):**
- **AuthService.login()**: verificar se usuário existe e `isActive`, verificar se `emailVerified: true`, verificar se `isLocked: false` (se bloqueado e `lockedUntil < NOW()`, desbloquear automaticamente), verificar senha via `HashService`, se senha inválida: incrementar `loginAttempts`, contar falhas recentes (15min via `LoginAttemptRepository`), se >= 5 falhas: bloquear conta (`isLocked: true`, `lockedUntil: NOW() + 30min`), enviar email de bloqueio, lançar erro, se senha válida: resetar `loginAttempts: 0`, registrar tentativa de login bem-sucedida (`LoginAttemptRepository`), gerar access token (15min), gerar refresh token (7 dias, armazenar hash SHA256 via `RefreshTokenRepository`), limitar a 10 refresh tokens ativos (remover mais antigos), retornar access token em JSON e refresh token em httpOnly cookie
- **AuthService.generateRefreshToken()**: gerar JWT com JTI, expirar em 7 dias, retornar JWT plaintext (para cookie) e hash SHA256 (para armazenar)
- **AuthService.checkAndLockAccount()**: contar tentativas de login falhas em 15min, se >= 5: bloquear conta, enviar email
- **AuthService.checkAndUnlockAccount()**: se `isLocked && lockedUntil < NOW()`: desbloquear conta

**Arquitetura (impacto/restrição):**
Application depende de interfaces de domain (CLAUDE.md seção "Architecture"). Injetar `RefreshTokenRepositoryPort`, `LoginAttemptRepositoryPort`, `EmailServicePort`.

**Dados (impacto):**
Atualiza `users.login_attempts`, `users.is_locked`, `users.locked_until`, cria `refresh_tokens`, cria `login_attempts`.

**Evidência/Verificação:**
```bash
make test            # Testes unitários do AuthService.login()
```

**Critério de pronto:**
- [ ] Login verifica `emailVerified: true`
- [ ] Login verifica `isLocked: false` (desbloqueio automático se `lockedUntil < NOW()`)
- [ ] Senha inválida incrementa `loginAttempts` e bloqueia após 5 falhas em 15min
- [ ] Email de bloqueio enviado
- [ ] Senha válida reseta `loginAttempts: 0`
- [ ] Tentativa de login registrada (`LoginAttemptRepository`)
- [ ] Access token (15min) e refresh token (7 dias) gerados
- [ ] Refresh token armazenado (hash SHA256) via `RefreshTokenRepository`
- [ ] Limite de 10 refresh tokens ativos respeitado
- [ ] Cookies httpOnly configurados corretamente
- [ ] Testes unitários passam

---

### Passo 9 — Application layer: AuthService - refresh token com rotação e logout

**Intenção:** Implementar renovação de access token via refresh token (com rotação obrigatória) e logout seguro.

**O que vai mudar (alto nível):**
- Adicionar: métodos `refreshToken()`, `logout()`
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/application/services/auth.service.ts` (adicionar métodos)

**Responsabilidades (funções/métodos):**
- **AuthService.refreshToken()**: extrair refresh token de cookie httpOnly, validar JWT (assinatura, expiração), extrair JTI, buscar refresh token via `RefreshTokenRepository.findByJti()`, verificar se não está revogado, verificar se não expirou, gerar hash SHA256 e comparar com `tokenHash`, se inválido/expirado/revogado: lançar 401, se token revogado/substituído for usado novamente: detectar possível roubo (invalidar TODOS os refresh tokens do usuário via `RefreshTokenRepository.revokeAllByUserId()`), lançar 401, revogar refresh token atual (`revoke()`, motivo `'token_rotation'`, armazenar `replacedByJti`), gerar novo par access+refresh tokens, armazenar novo refresh token, retornar novo access token em JSON e novo refresh token em httpOnly cookie
- **AuthService.logout()**: extrair refresh token de cookie, validar JWT (se válido), revogar via `RefreshTokenRepository.revoke()` (motivo `'user_logout'`), limpar cookies httpOnly, retornar mensagem de sucesso

**Arquitetura (impacto/restrição):**
Application depende de interfaces de domain (CLAUDE.md seção "Architecture"). Injetar `RefreshTokenRepositoryPort`.

**Dados (impacto):**
Atualiza `refresh_tokens.revoked_at`, `refresh_tokens.revoked_reason`, `refresh_tokens.replaced_by_jti`, cria novo `refresh_token`.

**Evidência/Verificação:**
```bash
make test            # Testes unitários do AuthService.refreshToken() e logout()
```

**Critério de pronto:**
- [ ] `refreshToken()` valida JWT e JTI corretamente
- [ ] Token revogado/expirado retorna 401
- [ ] Detecção de roubo de token (revogação de todos os tokens do usuário)
- [ ] Rotação obrigatória (token anterior invalidado)
- [ ] Novo par access+refresh tokens gerado
- [ ] `logout()` revoga refresh token e limpa cookies
- [ ] Testes unitários passam

---

### Passo 10 — Application layer: AuthService - recuperação de senha

**Intenção:** Implementar solicitação e reset de senha via email com token JWT.

**O que vai mudar (alto nível):**
- Adicionar: métodos `forgotPassword()`, `resetPassword()`
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/application/services/auth.service.ts` (adicionar métodos)

**Responsabilidades (funções/métodos):**
- **AuthService.forgotPassword()**: buscar usuário por email, aplicar rate limit (1 envio a cada 5min por IP), se usuário não existir: retornar mensagem genérica (não vazar se email existe), gerar token de recuperação JWT (`PasswordResetPayload`, expiração 1h), enviar email via `EmailService.sendPasswordResetEmail()`, retornar mensagem genérica de sucesso
- **AuthService.resetPassword()**: validar token JWT (`PasswordResetPayload`), verificar se usuário existe, hashear nova senha via `HashService`, atualizar senha no banco, invalidar TODOS os refresh tokens do usuário (`RefreshTokenRepository.revokeAllByUserId()`, motivo `'password_reset'`), enviar email de confirmação via `EmailService.sendPasswordChangedEmail()`, retornar mensagem de sucesso
- **AuthService.generatePasswordResetToken()**: gerar JWT com payload `{ userId, type: 'password_reset' }`, expiração 1h

**Arquitetura (impacto/restrição):**
Application depende de interfaces de domain (CLAUDE.md seção "Architecture"). Injetar `UserRepositoryPort`, `RefreshTokenRepositoryPort`, `EmailServicePort`, `HashService`.

**Dados (impacto):**
Atualiza `users.password_hash`, revoga todos os `refresh_tokens` do usuário.

**Evidência/Verificação:**
```bash
make test            # Testes unitários do AuthService.forgotPassword() e resetPassword()
```

**Critério de pronto:**
- [ ] `forgotPassword()` aplica rate limit (5min por IP)
- [ ] Mensagem genérica retornada (não vaza se email existe)
- [ ] Token de recuperação gerado (JWT, 1h)
- [ ] Email de recuperação enviado
- [ ] `resetPassword()` valida token JWT corretamente
- [ ] Senha atualizada (Argon2 + pepper)
- [ ] Todos os refresh tokens invalidados
- [ ] Email de confirmação enviado
- [ ] Testes unitários passam

---

### Passo 11 — Presentation layer: AuthController - novos endpoints e alteração de login/signup

**Intenção:** Expor novos endpoints de autenticação no controller e ajustar login/signup para usar cookies httpOnly.

**O que vai mudar (alto nível):**
- Adicionar: endpoints `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `POST /v1/auth/verify-email`, `POST /v1/auth/resend-verification`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`
- Alterar: `POST /v1/auth/signup` (usar novo DTO com `organizationId`), `POST /v1/auth/login` (configurar cookies httpOnly para refresh token)
- Remover: endpoint `POST /v1/auth/protected` (era apenas exemplo)

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/presentation/controllers/auth.controller.ts` (adicionar métodos)

**Responsabilidades (funções/métodos):**
- **AuthController.signup()**: receber `SignupDto` (com `organizationId`), chamar `AuthService.signup()`, retornar resposta 201 com mensagem e `userId`
- **AuthController.login()**: usar `PasswordAuthGuard`, extrair `user` do request, chamar `AuthService.login()`, configurar cookie httpOnly para refresh token (secure, sameSite: strict, maxAge: 7 dias), retornar resposta 200 com access token e dados do usuário
- **AuthController.refresh()**: extrair refresh token de cookie, chamar `AuthService.refreshToken()`, configurar novo cookie httpOnly, retornar resposta 200 com novo access token
- **AuthController.logout()**: extrair refresh token de cookie, chamar `AuthService.logout()`, limpar cookies, retornar resposta 200 com mensagem
- **AuthController.verifyEmail()**: receber `VerifyEmailDto`, chamar `AuthService.verifyEmail()`, retornar resposta 200 com mensagem
- **AuthController.resendVerification()**: receber `ResendVerificationDto`, chamar `AuthService.resendVerification()`, retornar resposta 200 com mensagem
- **AuthController.forgotPassword()**: receber `ForgotPasswordDto`, chamar `AuthService.forgotPassword()`, retornar resposta 200 com mensagem
- **AuthController.resetPassword()**: receber `ResetPasswordDto`, chamar `AuthService.resetPassword()`, retornar resposta 200 com mensagem

**Arquitetura (impacto/restrição):**
Presentation depende de application (CLAUDE.md seção "Architecture"). Usar decorators NestJS (`@Post`, `@Body`, `@Res`, `@Req`).

**Dados (impacto):**
Não afeta dados diretamente (apenas chamadas para services).

**Evidência/Verificação:**
```bash
make test            # Testes unitários do AuthController
make e2e             # Testes E2E dos novos endpoints
```

**Critério de pronto:**
- [ ] Todos os endpoints criados com decorators corretos
- [ ] Login configura cookie httpOnly para refresh token
- [ ] Refresh configura novo cookie httpOnly
- [ ] Logout limpa cookies
- [ ] DTOs corretos em cada endpoint
- [ ] Respostas HTTP corretas (201, 200, 401, etc.)
- [ ] Testes unitários passam
- [ ] Testes E2E passam

---

### Passo 12 — Shared layer: guards e interceptors para multi-tenancy

**Intenção:** Implementar isolamento automático de dados por organização via guards/interceptors.

**O que vai mudar (alto nível):**
- Adicionar: `OrganizationGuard` (verificar se usuário tem acesso à organização), `OrganizationInterceptor` (filtrar queries automaticamente por `organizationId`)
- Alterar: `JwtAuthGuard` (adicionar `organizationId` ao request)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/shared/guards/organization.guard.ts`
- `src/shared/interceptors/organization.interceptor.ts`
- `src/modules/auth/infra/adapters/credentials/jwt-auth.guard.ts` (alterar)

**Responsabilidades (funções/métodos):**
- **OrganizationGuard**: extrair `organizationId` do request (via JWT payload), verificar se usuário é `SUPER_ADMIN` (bypass do guard), se não for `SUPER_ADMIN`: verificar se `organizationId` do usuário corresponde ao recurso acessado, lançar 403 se não corresponder
- **OrganizationInterceptor**: interceptar queries Prisma, adicionar filtro `organizationId` automaticamente (exceto para `SUPER_ADMIN`), funcionar globalmente ou por controller
- **JwtAuthGuard**: adicionar `organizationId` ao `request.user` após validação do token JWT

**Arquitetura (impacto/restrição):**
Shared layer é usado por todos os módulos (CLAUDE.md seção "Shared Layer"). Guards/interceptors devem ser genéricos.

**Dados (impacto):**
Filtra queries automaticamente por `organizationId`.

**Evidência/Verificação:**
```bash
make test            # Testes unitários dos guards/interceptors
make e2e             # Testes E2E de isolamento multi-tenancy
```

**Critério de pronto:**
- [ ] `OrganizationGuard` verifica acesso à organização
- [ ] `SUPER_ADMIN` bypassa guard
- [ ] `OrganizationInterceptor` filtra queries por `organizationId`
- [ ] `JwtAuthGuard` adiciona `organizationId` ao request
- [ ] Testes unitários passam
- [ ] Testes E2E confirmam isolamento

---

### Passo 13 — Infra layer: TokenCleanupService (cron job) para remoção de tokens expirados

**Intenção:** Criar job agendado (cron) para remover refresh tokens expirados e tentativas de login antigas.

**O que vai mudar (alto nível):**
- Adicionar: `TokenCleanupService` (cron job diário às 03:00 UTC)
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/infra/services/token-cleanup.service.ts`
- `src/modules/auth/auth.module.ts` (importar `ScheduleModule.forRoot()`, registrar service)

**Responsabilidades (funções/métodos):**
- **TokenCleanupService.cleanupExpiredTokens()**: decorado com `@Cron('0 3 * * *')`, chamar `RefreshTokenRepository.deleteExpired()`, chamar `LoginAttemptRepository.deleteOlderThan(60)` (> 60 dias), logar resultado (quantos registros removidos)

**Arquitetura (impacto/restrição):**
Infra depende de interfaces de domain (CLAUDE.md seção "Architecture"). Usar `@nestjs/schedule` para cron.

**Dados (impacto):**
Remove registros de `refresh_tokens` e `login_attempts`.

**Evidência/Verificação:**
```bash
npm install @nestjs/schedule
npm run check        # Type checking
make test            # Testes unitários do TokenCleanupService (mockar cron)
```

**Critério de pronto:**
- [ ] `TokenCleanupService` criado com método `@Cron`
- [ ] Cron configurado para 03:00 UTC diariamente
- [ ] Tokens expirados removidos
- [ ] Tentativas de login antigas (> 60 dias) removidas
- [ ] Logs estruturados de resultado
- [ ] `@nestjs/schedule` instalado
- [ ] Service registrado no módulo
- [ ] Testes unitários passam

---

### Passo 14 — Rate limiting específico para endpoints de autenticação

**Intenção:** Aplicar rate limiting de 5 req/min por IP nos endpoints de autenticação.

**O que vai mudar (alto nível):**
- Adicionar: configuração de rate limiting específico para `/v1/auth/*` (5 req/min por IP)
- Alterar: `AuthController` (decorar com `@Throttle()`)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/presentation/controllers/auth.controller.ts` (adicionar decorator `@Throttle`)
- `src/app.module.ts` ou `src/modules/auth/auth.module.ts` (configurar ThrottlerModule)

**Responsabilidades (funções/métodos):**
- **AuthController**: decorar endpoints críticos (`login`, `signup`, `forgotPassword`, `resendVerification`, `refresh`) com `@Throttle({ default: { limit: 5, ttl: 60000 } })`
- **ThrottlerModule**: configurar rate limiting global (30 req/min) e permitir override por endpoint

**Arquitetura (impacto/restrição):**
ThrottlerModule já está configurado globalmente (CLAUDE.md seção "Security & Validation"). Apenas aplicar override.

**Dados (impacto):**
Não afeta dados (apenas rate limiting).

**Evidência/Verificação:**
```bash
make e2e             # Testes E2E de rate limiting (bloquear após 5 req/min)
```

**Critério de pronto:**
- [ ] Endpoints críticos decorados com `@Throttle(5, 60)`
- [ ] Rate limiting funcional (bloqueia após 5 req/min por IP)
- [ ] Resposta 429 Too Many Requests após limite
- [ ] Testes E2E passam

---

### Passo 15 — Seed script: criar SUPER_ADMIN inicial e organização default

**Intenção:** Criar seed para popular banco com `SUPER_ADMIN` (Anderson Santo) e organização default.

**O que vai mudar (alto nível):**
- Adicionar: lógica no seed script para criar `SUPER_ADMIN` e organização default
- Alterar: `scripts/seed.ts` (adicionar lógica)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `scripts/seed.ts`

**Responsabilidades (funções/métodos):**
- **seed.ts**: verificar se `SUPER_ADMIN` já existe (email `andersonsanto08@gmail.com` ou `anderson.santo@caju.com.br`), se não existir: criar organização default (`name: "Default Organization"`, `slug: "default"`), criar `SUPER_ADMIN` com `fullName: "Anderson Santo"`, `email: "andersonsanto08@gmail.com"`, `password: "Admin@123"` (hash Argon2), `emailVerified: true`, `isActive: true`, `organizationId: null`, role `SUPER_ADMIN`, logar resultado

**Arquitetura (impacto/restrição):**
Seed script usa Prisma diretamente (fora da arquitetura hexagonal, ok para scripts).

**Dados (impacto):**
Cria 1 organização e 1 `SUPER_ADMIN`.

**Evidência/Verificação:**
```bash
make db-seed         # Rodar seed script
psql $DATABASE_URL -c "SELECT * FROM users WHERE email = 'andersonsanto08@gmail.com';"
```

**Critério de pronto:**
- [ ] Organização default criada
- [ ] `SUPER_ADMIN` criado com email `andersonsanto08@gmail.com`
- [ ] Senha hasheada corretamente
- [ ] `emailVerified: true`, `isActive: true`, `organizationId: null`
- [ ] Role `SUPER_ADMIN` atribuída
- [ ] Seed idempotente (não duplica se já existir)
- [ ] Logs estruturados de resultado

---

### Passo 16 — Documentação Swagger: atualizar endpoints de autenticação

**Intenção:** Atualizar Swagger com novos endpoints e contratos de autenticação.

**O que vai mudar (alto nível):**
- Adicionar: decorators Swagger em novos endpoints (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiCookieAuth`)
- Alterar: decorators em endpoints existentes (login, signup)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `src/modules/auth/presentation/controllers/auth.controller.ts` (adicionar decorators Swagger)

**Responsabilidades (funções/métodos):**
- **AuthController**: adicionar decorators `@ApiOperation()`, `@ApiResponse()`, `@ApiBody()` em todos os endpoints, adicionar `@ApiCookieAuth()` em endpoints que usam refresh token

**Arquitetura (impacto/restrição):**
Swagger é gerado automaticamente via decorators (CLAUDE.md seção "API Documentation").

**Dados (impacto):**
Não afeta dados (apenas documentação).

**Evidência/Verificação:**
```bash
make start           # Iniciar aplicação
curl http://localhost:3000/api  # Verificar Swagger UI
```

**Critério de pronto:**
- [ ] Todos os endpoints documentados no Swagger
- [ ] Exemplos de request/response corretos
- [ ] Cookies httpOnly documentados (`@ApiCookieAuth`)
- [ ] Swagger UI acessível em `/api`
- [ ] Documentação clara e completa

---

### Passo 17 — Testes E2E: flows completos de autenticação

**Intenção:** Criar testes E2E para validar flows completos (signup → verify → login → refresh → logout, recovery, bloqueio).

**O que vai mudar (alto nível):**
- Adicionar: suítes de testes E2E (`auth.e2e-spec.ts`) para todos os flows
- Alterar: nada
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `test/auth.e2e-spec.ts`

**Responsabilidades (funções/métodos):**
- **auth.e2e-spec.ts**: testar flows:
  - Signup → verificar email → login
  - Login → refresh token → logout
  - Recuperação de senha (forgot → reset)
  - Bloqueio de conta (5 tentativas falhas)
  - Multi-tenancy (isolamento entre organizações)
  - Rate limiting (bloquear após 5 req/min)
  - Refresh token rotation (token anterior invalidado)
  - Detecção de roubo de token (reuso de token revogado)
  - Desbloqueio automático após 30min

**Arquitetura (impacto/restrição):**
Testes E2E usam Supertest (CLAUDE.md seção "Testing").

**Dados (impacto):**
Testes usam banco de dados de teste (limpar antes/depois).

**Evidência/Verificação:**
```bash
make e2e             # Rodar testes E2E
```

**Critério de pronto:**
- [ ] Todos os flows testados com sucesso
- [ ] Testes passam sem erros
- [ ] Coverage >= 90% em `AuthService`, guards, strategies
- [ ] Testes E2E completos e isolados

---

### Passo 18 — Variáveis de ambiente e configuração final

**Intenção:** Adicionar variáveis de ambiente necessárias e validar configuração completa.

**O que vai mudar (alto nível):**
- Adicionar: variáveis SMTP, rate limiting, tokens de expiração no `.env.example`
- Alterar: `.env.example` (adicionar novas variáveis)
- Remover: nada

**Escopo provável (arquivos/áreas):**
- `.env.example`
- `README.md` (apenas se mudanças críticas, ex: novas envs obrigatórias)

**Responsabilidades (funções/métodos):**
- **.env.example**: adicionar variáveis:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `JWT_ACCESS_TOKEN_EXPIRATION` (default: `15m`)
  - `JWT_REFRESH_TOKEN_EXPIRATION` (default: `7d`)
  - `EMAIL_VERIFICATION_EXPIRATION` (default: `24h`)
  - `PASSWORD_RESET_EXPIRATION` (default: `1h`)
  - `ACCOUNT_LOCK_DURATION` (default: `30m`)
  - `RATE_LIMIT_AUTH_TTL` (default: `60000`)
  - `RATE_LIMIT_AUTH_LIMIT` (default: `5`)

**Arquitetura (impacto/restrição):**
Não atualizar README.md com mudanças triviais (CLAUDE.md seção "Preferências de Código").

**Dados (impacto):**
Não afeta dados (apenas configuração).

**Evidência/Verificação:**
```bash
cp .env.example .env
make db-setup        # Validar setup completo
make start           # Iniciar aplicação
```

**Critério de pronto:**
- [ ] Todas as variáveis adicionadas ao `.env.example`
- [ ] Valores default documentados
- [ ] Aplicação inicia sem erros de config
- [ ] README.md atualizado apenas se necessário (novas envs obrigatórias)

---

## 7) Riscos e mitigação

### Risco 1: Backfill de `organization_id` em usuários existentes
**Impacto:** Médio
**Probabilidade:** Alta
**Mitigação:** Migration V3 deve criar organização "default" e popular `organization_id` de usuários existentes (exceto `SUPER_ADMIN`). Testar em ambiente de dev primeiro.

### Risco 2: Email não chegando (SMTP mal configurado)
**Impacto:** Alto
**Probabilidade:** Média
**Mitigação:** Validar config SMTP em ambiente de dev (usar Mailtrap ou similar). Adicionar retry logic no `EmailService` (3 tentativas com backoff). Logar erros de envio para alerta.

### Risco 3: Race condition em bloqueio de conta (múltiplos logins simultâneos)
**Impacto:** Médio
**Probabilidade:** Baixa
**Mitigação:** Usar transações Prisma ao incrementar `login_attempts` e verificar bloqueio. Testar E2E com múltiplas requisições simultâneas.

### Risco 4: Refresh token rotation falha e invalida tokens válidos
**Impacto:** Alto
**Probabilidade:** Baixa
**Mitigação:** Testar exaustivamente rotação em testes unitários e E2E. Adicionar logs detalhados. Implementar fallback (se rotação falhar, não invalidar token anterior imediatamente).

### Risco 5: Cleanup job remove tokens ainda válidos
**Impacto:** Crítico
**Probabilidade:** Muito Baixa
**Mitigação:** Cleanup deve verificar `expiresAt < NOW()` e `revokedAt IS NOT NULL`. Testar job em ambiente de staging primeiro. Adicionar dry-run mode.

### Risco 6: Multi-tenancy quebra queries existentes
**Impacto:** Alto
**Probabilidade:** Média
**Mitigação:** Implementar `OrganizationInterceptor` de forma incremental. Testar isolamento em testes E2E. Revisar queries manualmente. `SUPER_ADMIN` deve bypassar filtros.

### Risco 7: Mensagens genéricas facilitam ataque de enumeração de emails
**Impacto:** Médio
**Probabilidade:** Baixa
**Mitigação:** Sempre retornar mensagens genéricas em `forgotPassword()`, `login()` (não vazar se email existe). Adicionar rate limiting agressivo. Monitorar tentativas de enumeração via logs.

---

## 8) Definition of Done (checklist)

- [x] Critérios de aceite do PRD cobertos no plano
- [x] Passos pequenos e verificáveis, com evidência clara
- [x] Sem snippets/pseudocódigo/implementação
- [x] Arquitetura identificada e respeitada (seção 3 preenchida)
- [x] Mudanças de dados descritas como modelagem (sem DDL/DML) quando aplicável (seção 4 preenchida)
- [x] Contratos definidos somente quando necessário (seção 5 preenchida)
- [ ] Todas as migrations aplicadas com sucesso
- [ ] Todos os testes unitários passando (>= 90% coverage em módulos críticos)
- [ ] Todos os testes E2E passando
- [ ] Swagger atualizado com novos endpoints
- [ ] Variáveis de ambiente documentadas em `.env.example`
- [ ] Email de confirmação/recuperação funcionando (SMTP configurado)
- [ ] Rate limiting funcional em endpoints de autenticação
- [ ] Cleanup job removendo tokens expirados diariamente
- [ ] Multi-tenancy funcionando (isolamento entre organizações)
- [ ] `SUPER_ADMIN` criado via seed script
- [ ] Logs estruturados (sem senhas/tokens em plaintext)
- [ ] `make lint` passa sem erros
- [ ] `npm run check` passa sem erros

---

## 9) Perguntas em aberto / Assunções

### Assunções:
1. Usuários existentes no banco (se houver) serão migrados para organização "default" automaticamente.
2. SMTP está configurado e funcional (SendGrid, AWS SES, ou SMTP local).
3. Front-end é responsável por interceptar 401 e chamar `/refresh` automaticamente.
4. `SUPER_ADMIN` inicial terá email `andersonsanto08@gmail.com` e senha `Admin@123` (mudar após primeiro login).
5. Refresh tokens em cookies httpOnly são a única forma de armazenar refresh tokens (não em localStorage).
6. Templates HTML de emails são simples e responsivos, sem customização inicial.
7. Cleanup job roda em servidor único (não distribuído). Se houver múltiplas instâncias, usar lock distribuído (Redis) ou rodar job em apenas 1 instância.

### Perguntas em aberto:
1. **Q:** Front-end já está preparado para lidar com cookies httpOnly e renovação automática de tokens?
   **A esperada:** Sim, front-end deve interceptar 401 e chamar `/refresh`.

2. **Q:** Qual provedor SMTP usar em produção (SendGrid, AWS SES, Mailgun)?
   **A esperada:** Configurável via env vars, implementação agnóstica.

3. **Q:** Como `SUPER_ADMIN` gerencia organizações (criar, editar, desativar)?
   **A esperada:** Endpoint `POST /v1/organizations` (fora do escopo deste plano, mas necessário para multi-tenancy funcionar).

4. **Q:** Desbloqueio manual por `SUPER_ADMIN` deve ser implementado agora ou em versão futura?
   **A esperada:** Implementar agora (endpoint `POST /v1/admin/unlock-account/:userId`, restrito a `SUPER_ADMIN`).

5. **Q:** Cleanup job deve rodar em todas as instâncias ou apenas 1 (lock distribuído)?
   **A esperada:** Se aplicação é stateless com múltiplas instâncias, usar lock distribuído (Redis) ou garantir que job roda em apenas 1 instância (flag de ambiente).

---

**Fim do PLAN-auth.md**
