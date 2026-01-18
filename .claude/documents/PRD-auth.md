# PRD (Product Requirements Document): Sistema de Autenticação e Autorização Completo

<!-- Sistema robusto de autenticação JWT com refresh tokens, multi-tenancy, roles, validação de email, recuperação de senha e proteções contra ataques. -->

**Feature:** `auth`
**Jira:** N/A
**Fontes:** `.claude/context/AUTH.md`, código existente em `src/modules/auth/`, `prisma/schema.prisma`

---

## 1) Problema

Atualmente, o sistema possui apenas autenticação básica (signup/login) com JWT, sem refresh tokens implementados, sem validação de email, sem recuperação de senha, sem bloqueio de conta, sem multi-tenancy (organizações) e sem proteções avançadas contra ataques (brute force, rate limiting específico).
Usuários não conseguem gerenciar múltiplos dispositivos, recuperar senhas esquecidas, ou trabalhar isolados por organização.

## 2) Contexto atual

### Implementado e precisando ser revisto/melhorado:
- Signup básico (`POST /auth/signup`)
- Login com email/senha (`POST /auth/login`) usando PasswordAuthGuard (Passport local)
- JWT RS256 com access token retornado em JSON
- Hashing de senhas com Argon2 + pepper
- Roles básicas: `USER` atribuída automaticamente no signup
- Guards: `JwtAuthGuard` (Bearer token), `PasswordAuthGuard` (validação email/senha)
- Modelo de dados: `User`, `UserRole`, `RefreshToken` (modelo existe mas não está sendo usado)
- Validation pipes globais

### Não implementado:
- Refresh tokens (emissão, persistência, rotação, cleanup)
- Logout seguro (invalidação de tokens)
- Validação de email pós-cadastro
- Recuperação de senha
- Bloqueio de conta após tentativas falhas de login
- Multi-tenancy (modelo `Organization`, isolamento por organização)
- Role `SUPER_ADMIN` e controle de permissões avançado
- Rate limiting específico para endpoints de autenticação
- Proteção CSRF
- Monitoramento de tentativas de login suspeitas
- Notificações por email (bloqueio, recuperação, confirmação)
- Cleanup automático de refresh tokens expirados

## 3) Objetivos (outcomes)

- [ ] Usuários podem fazer login seguro com múltiplos dispositivos (até 10 refresh tokens ativos por usuário)
- [ ] Usuários recebem email de confirmação após signup e só podem acessar recursos protegidos após validar email
- [ ] Usuários conseguem recuperar senha via email se esquecerem
- [ ] Contas são bloqueadas automaticamente após 5 tentativas falhas de login consecutivas em 15 minutos
- [ ] Sistema notifica usuário por email quando conta é bloqueada
- [ ] Refresh tokens são rotacionados a cada uso para máxima segurança
- [ ] Tokens expirados são removidos automaticamente (cleanup job diário)
- [ ] Sistema suporta multi-tenancy: cada usuário pertence a uma organização e só acessa dados da própria organização
- [ ] `SUPER_ADMIN` pode gerenciar todas as organizações e usuários
- [ ] `USER` tem acesso limitado apenas aos recursos da própria organização
- [ ] Endpoints de autenticação são protegidos contra brute force via rate limiting (máx 5 tentativas/min por IP)
- [ ] Logs estruturados registram todas as tentativas de login (sucesso e falha) para auditoria
- [ ] Todas as mensagens de erro são genéricas para não vazar informações sensíveis

## 4) Não-objetivos

- 2FA/MFA (fica para versão futura)
- Backup codes
- Login social (Google, Facebook, etc.)
- Customização de templates de email (usar templates HTML simples e responsivos)
- Biometria ou autenticação passwordless
- Single Sign-On (SSO)
- Gestão de organizações pelo próprio usuário (apenas `SUPER_ADMIN` gerencia)

## 5) Regras de negócio

1. **Signup:**
   - Email único no sistema
   - Senha deve atender critérios de segurança (mín 8 caracteres, 1 letra, 1 número, 1 caractere especial)
   - Nova conta recebe role `USER` por padrão
   - Nova conta criada com `emailVerified: false`, `isActive: true`
   - Enviar email de confirmação com link único e expiração em 24h

2. **Login:**
   - Apenas usuários com `emailVerified: true` podem fazer login
   - Apenas usuários com `isActive: true` podem fazer login
   - Retornar access token (curta duração: 15min) e refresh token (longa duração: 7 dias) em httpOnly cookies
   - Registrar tentativa de login (sucesso/falha) com IP, user-agent, timestamp
   - Se 5 tentativas falhas consecutivas em 15min: bloquear conta (`isActive: false`), enviar email de notificação

3. **Refresh Token:**
   - Refresh token só pode ser usado 1 vez (rotação obrigatória)
   - Ao usar refresh token: invalidar anterior (`revokedAt`, `replacedByJti`), emitir novo par access+refresh
   - Limite de 10 refresh tokens ativos por usuário: remover os mais antigos automaticamente
   - Refresh token inválido/expirado/revogado: retornar 401, forçar novo login

4. **Logout:**
   - Invalidar refresh token atual (`revokedAt`, `revokedReason: 'user_logout'`)
   - Limpar cookies httpOnly

5. **Validação de Email:**
   - Link de confirmação expira em 24h
   - Token de confirmação: JWT com `{ userId, type: 'email_verification' }`
   - Após confirmação: atualizar `emailVerified: true`
   - Permitir reenvio de email de confirmação (rate limit: 1 a cada 5min)

6. **Recuperação de Senha:**
   - Link de recuperação expira em 1h
   - Token de recuperação: JWT com `{ userId, type: 'password_reset' }`
   - Após reset: invalidar todos os refresh tokens do usuário
   - Enviar email confirmando alteração de senha
   - Rate limit: 1 email de recuperação a cada 5min por IP

7. **Bloqueio de Conta:**
   - Bloqueio automático após 5 tentativas falhas em 15min
   - Desbloqueio automático após 30min ou manualmente por `SUPER_ADMIN`
   - Enviar email informando bloqueio e instruções de desbloqueio

8. **Multi-tenancy:**
   - Todo usuário (exceto `SUPER_ADMIN`) deve pertencer a 1 organização
   - `SUPER_ADMIN` não pertence a organização (acesso global)
   - Queries automáticas devem filtrar por `organizationId` do usuário logado (exceto `SUPER_ADMIN`)
   - Validar que usuário só acessa dados da própria organização em guards/interceptors

9. **Roles e Permissões:**
   - `SUPER_ADMIN`: acesso total, gerencia organizações e todos os usuários, único role que pode criar outros `SUPER_ADMIN`s
   - `USER`: acesso limitado aos recursos da própria organização
   - Guards devem verificar role antes de permitir acesso a rotas protegidas

10. **Segurança:**
    - Sempre usar HTTPS em produção
    - Cookies httpOnly para tokens
    - Mensagens de erro genéricas ("Invalid credentials" ao invés de "Email not found")
    - Logs não devem conter senhas ou tokens em plaintext
    - Todas as timestamps em UTC

## 6) Restrições e premissas

### Premissas:
- SMTP configurável via env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- Nodemailer para envio de emails
- Templates HTML simples e responsivos (sem customização inicial)
- Front-end lida com conversão de timezone (backend sempre UTC)
- Apenas Anderson Santo será `SUPER_ADMIN` inicialmente (seed script)
- Ilimitados dispositivos simultâneos, mas limitado a 10 refresh tokens ativos/usuário

### Restrições:
- Access token expira em 15min
- Refresh token expira em 7 dias
- Email de confirmação expira em 24h
- Email de recuperação de senha expira em 1h
- Bloqueio de conta dura 30min (desbloqueio automático)
- Rate limit global: 30 req/min por IP (ThrottlerModule)
- Rate limit auth endpoints: 5 req/min por IP
- Máximo de 5 tentativas de login em 15min antes de bloqueio
- Cleanup job de refresh tokens expirados roda 1x/dia (cron: 03:00 UTC)

## 7) Edge cases

- **Usuário tenta validar email com token expirado:** retornar erro claro, permitir reenvio
- **Usuário tenta usar refresh token já revogado/substituído:** retornar 401, forçar novo login, detectar possível roubo de token (invalidar todos os refresh tokens do usuário)
- **Usuário tenta recuperar senha mas não tem email verificado:** permitir recuperação, mas exigir verificação de email após reset
- **Usuário tenta login com email verificado mas conta bloqueada:** retornar "Account locked" com instruções
- **`SUPER_ADMIN` tenta acessar dados de organização inexistente:** permitir (acesso global)
- **USER tenta acessar dados de outra organização:** retornar 403 Forbidden
- **Múltiplas tentativas de login simultâneas (mesma conta, IPs diferentes):** contar todas as tentativas, bloquear se exceder limite
- **Refresh token expirado mas ainda não foi cleanup:** retornar 401, não emitir novo token
- **Usuário atinge 10 refresh tokens ativos:** remover o mais antigo automaticamente antes de criar novo
- **Clock skew entre servidor e cliente:** usar timestamps UTC com validação flexível (±5min) para tokens
- **Email de confirmação/recuperação reenviado antes de expirar o anterior:** invalidar token anterior, gerar novo

## 8) Interfaces / Contratos (stack-agnostic)

### Endpoints:

#### `POST /v1/auth/signup`
**Input:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "fullName": "John Doe",
  "organizationId": "uuid" // opcional, obrigatório se não for `SUPER_ADMIN`
}
```
**Output (201):**
```json
{
  "message": "User created. Please check your email to verify your account.",
  "userId": "uuid"
}
```
**Cookies:** Nenhum (usuário precisa validar email antes de fazer login)

#### `POST /v1/auth/login`
**Input:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```
**Output (200):**
```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "roles": ["USER"],
    "organizationId": "uuid"
  }
}
```
**Cookies:** `refreshToken` (httpOnly, secure, sameSite: strict, maxAge: 7 days)

#### `POST /v1/auth/refresh`
**Input:** Cookie `refreshToken`
**Output (200):**
```json
{
  "accessToken": "new-jwt-access-token"
}
```
**Cookies:** `refreshToken` (novo, rotacionado)

#### `POST /v1/auth/logout`
**Input:** Cookie `refreshToken`
**Output (200):**
```json
{
  "message": "Logged out successfully"
}
```
**Cookies:** Removidos

#### `POST /v1/auth/verify-email`
**Input:**
```json
{
  "token": "email-verification-jwt"
}
```
**Output (200):**
```json
{
  "message": "Email verified successfully. You can now log in."
}
```

#### `POST /v1/auth/resend-verification`
**Input:**
```json
{
  "email": "user@example.com"
}
```
**Output (200):**
```json
{
  "message": "Verification email sent. Please check your inbox."
}
```

#### `POST /v1/auth/forgot-password`
**Input:**
```json
{
  "email": "user@example.com"
}
```
**Output (200):**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

#### `POST /v1/auth/reset-password`
**Input:**
```json
{
  "token": "password-reset-jwt",
  "newPassword": "NewSecureP@ss456"
}
```
**Output (200):**
```json
{
  "message": "Password reset successfully. Please log in with your new password."
}
```

### Eventos internos (opcional para logging/auditoria):
- `user.signup` (userId, email, timestamp)
- `user.email_verified` (userId, timestamp)
- `auth.login_success` (userId, ip, userAgent, timestamp)
- `auth.login_failed` (email, ip, reason, timestamp)
- `auth.account_locked` (userId, reason, timestamp)
- `auth.account_unlocked` (userId, timestamp)
- `auth.password_reset` (userId, timestamp)
- `auth.logout` (userId, timestamp)

### Modelos de dados (schema changes):

#### `Organization` (nova tabela)
```
id: uuid
name: string
slug: string (unique)
isActive: boolean (default: true)
createdAt: datetime
updatedAt: datetime
```

#### `User` (adicionar campo)
```
organizationId: uuid (nullable, FK para Organization) // null apenas para `SUPER_ADMIN`
loginAttempts: int (default: 0)
lockedUntil: datetime (nullable)
```

#### `RefreshToken` (já existe, garantir campos)
```
id: uuid
userId: uuid (FK)
jti: string (unique)
tokenHash: string
deviceId: string (nullable)
ipAddress: string (nullable)
userAgent: string (nullable)
expiresAt: datetime
revokedAt: datetime (nullable)
revokedReason: string (nullable)
replacedByJti: string (nullable)
createdAt: datetime
updatedAt: datetime
```

#### `LoginAttempt` (nova tabela para auditoria)
```
id: uuid
email: string
userId: uuid (nullable, FK) // null se email não existir
ipAddress: string
userAgent: string
success: boolean
failureReason: string (nullable)
timestamp: datetime
```

### Email Templates:
- `email-verification.html`: link de confirmação
- `password-reset.html`: link de recuperação
- `account-locked.html`: notificação de bloqueio
- `password-changed.html`: confirmação de alteração de senha

## 9) Dependências (internas/externas)

### Internas:
- Módulo `user` (UserRepository, HashService, RoleEnum)
- Shared utilities (crypto, validators)
- Shared filters (exception handling)
- Shared decorators (@CurrentUser, @Normalize)
- Prisma client
- Pino logger

### Externas:
- `nodemailer` (envio de emails)
- `@nestjs/throttler` (rate limiting)
- `@nestjs/schedule` (cron jobs para cleanup)
- `@nestjs/jwt` (geração e validação de tokens)
- `@nestjs/passport` (strategies)
- `passport-local` (strategy de email/senha)
- `passport-jwt` (strategy de JWT)
- `class-validator`, `class-transformer` (validação de DTOs)
- Servidor SMTP configurado (SendGrid, AWS SES, ou SMTP local)

## 10) Observabilidade

### Logs:
- **Info:** signup sucesso, login sucesso, email enviado, logout, password reset sucesso, email verificado
- **Warn:** tentativa de login falha, refresh token inválido, email não verificado, tentativa de acesso sem permissão
- **Error:** falha ao enviar email, falha ao gerar token, falha ao salvar no banco
- **Audit:** todas as tentativas de login (sucesso/falha) em tabela `LoginAttempt`

### Métricas:
- Contador: `auth.signup.total`, `auth.login.success`, `auth.login.failed`, `auth.logout.total`
- Contador: `auth.email_verification.sent`, `auth.email_verification.success`
- Contador: `auth.password_reset.requested`, `auth.password_reset.success`
- Contador: `auth.account_locked.total`, `auth.account_unlocked.total`
- Contador: `auth.refresh_token.rotated`, `auth.refresh_token.revoked`
- Gauge: `auth.refresh_tokens.active` (total de tokens ativos)
- Histogram: `auth.login.duration` (tempo de resposta)

### Alertas:
- **Crítico:** Taxa de falhas de login > 50% em 5min (possível ataque)
- **Crítico:** Falha ao enviar emails > 10 em 1min
- **Warning:** Conta bloqueada (notificar `SUPER_ADMIN` se usuário específico for bloqueado repetidamente)
- **Warning:** Tentativa de uso de refresh token revogado (possível roubo de token)

## 11) Critérios de aceite

### Signup e Verificação de Email:
- [ ] Usuário consegue criar conta com email, senha e nome completo
- [ ] Sistema valida formato de email e força da senha
- [ ] Sistema envia email de confirmação automaticamente após signup
- [ ] Usuário não consegue fazer login sem verificar email
- [ ] Link de confirmação funciona e marca `emailVerified: true`
- [ ] Link de confirmação expirado retorna erro claro
- [ ] Usuário consegue reenviar email de confirmação (rate limit: 1/5min)

### Login e Refresh Token:
- [ ] Usuário com email verificado consegue fazer login com email/senha
- [ ] Sistema retorna access token (15min) e refresh token (7 dias) em cookies httpOnly
- [ ] Usuário consegue usar refresh token para renovar access token
- [ ] Refresh token é rotacionado a cada uso (anterior invalidado)
- [ ] Sistema limita a 10 refresh tokens ativos por usuário (remove mais antigos)
- [ ] Tentativa de usar refresh token revogado retorna 401

### Logout:
- [ ] Usuário consegue fazer logout
- [ ] Refresh token é invalidado após logout
- [ ] Cookies são removidos

### Recuperação de Senha:
- [ ] Usuário consegue solicitar recuperação de senha via email
- [ ] Sistema envia email com link de recuperação (expira em 1h)
- [ ] Link de recuperação funciona e permite definir nova senha
- [ ] Todos os refresh tokens são invalidados após reset de senha
- [ ] Sistema envia email de confirmação após alteração de senha
- [ ] Rate limit: 1 email de recuperação/5min por IP

### Bloqueio de Conta:
- [ ] Conta é bloqueada após 5 tentativas falhas de login em 15min
- [ ] Sistema envia email notificando bloqueio
- [ ] Conta é desbloqueada automaticamente após 30min
- [ ] Usuário bloqueado recebe mensagem clara ao tentar login
- [ ] `SUPER_ADMIN` consegue desbloquear conta manualmente

### Multi-tenancy:
- [ ] Usuário `USER` pertence a 1 organização
- [ ] `USER` só acessa dados da própria organização
- [ ] `SUPER_ADMIN` acessa dados de todas as organizações
- [ ] Tentativa de `USER` acessar dados de outra organização retorna 403

### Roles e Permissões:
- [ ] Nova conta recebe role `USER` por padrão
- [ ] `SUPER_ADMIN` consegue gerenciar todas as organizações e usuários
- [ ] Guards verificam role antes de permitir acesso a rotas protegidas

### Segurança:
- [ ] Mensagens de erro são genéricas (não vazam se email existe)
- [ ] Rate limiting ativo em endpoints de autenticação (5 req/min por IP)
- [ ] Senhas são hasheadas com Argon2 + pepper
- [ ] Tokens JWT assinados com RS256
- [ ] Cookies httpOnly, secure, sameSite: strict
- [ ] Logs não contêm senhas ou tokens em plaintext
- [ ] Timestamps sempre em UTC

### Observabilidade:
- [ ] Todas as tentativas de login são registradas em logs estruturados
- [ ] Tabela `LoginAttempt` registra tentativas de login para auditoria
- [ ] Métricas de autenticação são expostas (signup, login, logout, etc.)

### Cleanup e Manutenção:
- [ ] Job cron roda diariamente (03:00 UTC) para remover refresh tokens expirados
- [ ] Job cron remove tentativas de login antigas (> 60 dias)

## 12) Como verificar que funcionou

### Manual:

#### Signup + Verificação de Email:
- [ ] Criar conta via `POST /v1/auth/signup` com email válido
- [ ] Verificar que email de confirmação foi recebido
- [ ] Tentar login sem verificar email: deve retornar 401
- [ ] Clicar no link de confirmação do email
- [ ] Tentar login novamente: deve funcionar

#### Login + Refresh Token:
- [ ] Fazer login via `POST /v1/auth/login`
- [ ] Verificar que access token foi retornado e refresh token está em cookie httpOnly
- [ ] Usar access token para acessar rota protegida
- [ ] Esperar access token expirar (15min) ou invalidar manualmente
- [ ] Chamar `POST /v1/auth/refresh` com refresh token: deve retornar novo access token
- [ ] Verificar que novo refresh token foi emitido

#### Logout:
- [ ] Fazer logout via `POST /v1/auth/logout`
- [ ] Tentar usar refresh token antigo: deve retornar 401
- [ ] Verificar que cookies foram removidos

#### Recuperação de Senha:
- [ ] Solicitar recuperação via `POST /v1/auth/forgot-password`
- [ ] Verificar que email de recuperação foi recebido
- [ ] Clicar no link e definir nova senha via `POST /v1/auth/reset-password`
- [ ] Fazer login com nova senha: deve funcionar
- [ ] Tentar usar refresh token antigo: deve retornar 401 (todos invalidados)

#### Bloqueio de Conta:
- [ ] Fazer 5 tentativas de login com senha errada em < 15min
- [ ] Verificar que conta foi bloqueada e email de notificação foi enviado
- [ ] Tentar login com senha correta: deve retornar "Account locked"
- [ ] Esperar 30min e tentar novamente: deve funcionar

#### Multi-tenancy:
- [ ] Criar 2 organizações
- [ ] Criar usuário `USER` em cada organização
- [ ] Fazer login com `USER` da org A
- [ ] Tentar acessar dados da org B: deve retornar 403
- [ ] Fazer login com `SUPER_ADMIN`
- [ ] Acessar dados de ambas organizações: deve funcionar

### Automatizado:

#### Testes Unitários:
- [ ] AuthService: signup, login, refresh, logout, verify email, reset password
- [ ] HashService: hash e verify com Argon2
- [ ] JwtStrategy: validação de token
- [ ] PasswordStrategy: validação de email/senha
- [ ] Guards: JwtAuthGuard, PasswordAuthGuard, RolesGuard

#### Testes E2E:
- [ ] Signup flow completo (criação + verificação de email)
- [ ] Login flow completo (login + refresh + logout)
- [ ] Recuperação de senha flow completo
- [ ] Bloqueio de conta após tentativas falhas
- [ ] Multi-tenancy: isolamento entre organizações
- [ ] Rate limiting: bloquear após 5 req/min
- [ ] Refresh token rotation: invalidar anterior ao gerar novo

### Critérios de sucesso:
- [ ] 100% dos testes unitários passando
- [ ] 100% dos testes E2E passando
- [ ] Coverage >= 90% em módulos críticos (AuthService, guards, strategies)
- [ ] Nenhum log contendo senhas ou tokens em plaintext
- [ ] Rate limiting funcional em todos os endpoints de autenticação
- [ ] Email de confirmação/recuperação chegando em < 10s (SMTP configurado)
- [ ] Cleanup job removendo refresh tokens expirados diariamente
- [ ] Swagger atualizado com todos os endpoints de autenticação

## 13) Perguntas em aberto / Assunções

### Q1: Qual serviço de email usar (SendGrid, AWS SES, SMTP local)?
**A (confirmado):** SMTP configurável via env vars, implementação agnóstica usando Nodemailer. Permite usar qualquer provedor SMTP (SendGrid, AWS SES, Gmail, Mailgun, etc.) sem mudar código.

### Q2: 2FA deve ser obrigatório para `SUPER_ADMIN`?
**A (confirmado):** Não implementar 2FA nesta versão. Fica para versão futura.

### Q3: Quantos dispositivos simultâneos são permitidos?
**A (confirmado):** Ilimitado, mas com limite de 10 refresh tokens ativos por usuário. Cleanup automático dos mais antigos quando limite for atingido.

### Q4: Template de emails deve ser customizável?
**A (confirmado):** Usar templates HTML simples e responsivos, sem customização inicial. Templates em `src/modules/auth/templates/`.

### Q5: Bloqueio de conta deve notificar usuário por email?
**A (confirmado):** Sim, enviar email informando bloqueio e instruções de desbloqueio (aguardar 30min ou contatar suporte).

### Q6: Refresh token deve ser rotacionado mesmo se não expirou?
**A (confirmado):** Sim, sempre rotacionar a cada uso para máxima segurança. Invalidar anterior e emitir novo.

### Q7: Como lidar com timezone em logs e tokens?
**A (confirmado):** Usar UTC em todos os timestamps. Front-end faz conversão para timezone local do usuário.

### Q8: Como organizações são criadas?
**A (confirmado):** Apenas `SUPER_ADMIN` pode criar organizações via endpoint `POST /v1/organizations` (fora do escopo deste PRD, mas necessário para multi-tenancy funcionar). Seed script cria `SUPER_ADMIN` inicial.

### Q9: `SUPER_ADMIN` deve pertencer a uma organização?
**A (confirmado):** Não. Campo `organizationId` é `null` para `SUPER_ADMIN`, indicando acesso global.

### Q10: Como lidar com múltiplas tentativas de login simultâneas?
**A (confirmado):** Contar todas as tentativas (mesmo de IPs diferentes) e bloquear se exceder 5 em 15min. Usar campo `loginAttempts` e `lockedUntil` no modelo User.

### Q11: Refresh token deve ser armazenado hasheado?
**A (confirmado):** Sim, armazenar hash SHA256 do refresh token no campo `tokenHash`. Comparar hash ao validar.

### Q12: Como detectar roubo de refresh token?
**A (confirmado):** Se refresh token revogado/substituído for usado novamente, invalidar TODOS os refresh tokens do usuário e forçar novo login (possível indicação de roubo).

### Q13: Como garantir que front-end consegue renovar access token automaticamente?
**A (confirmado):** Front-end deve interceptar 401 (token expirado), chamar `POST /v1/auth/refresh` automaticamente, e retentar request original com novo access token. Refresh token em httpOnly cookie facilita esse fluxo.
