# Plano de Ação: Sistema de Autenticação e Autorização Completo

**Fonte:** `.claude/documents/PRD-auth.md`
**Jira:** N/A

---

## 📝 Melhorias Aplicadas (Revisão)

Este plano foi revisado e as seguintes melhorias críticas foram aplicadas:

1. ✅ **Bloqueio de Conta**: Corrigido para atualizar `isLocked: true` ao bloquear, além de `lockedUntil`
2. ✅ **Login com Refresh Token**: Adicionada instrução explícita para atualizar endpoint `/login` existente
3. ✅ **Conflito entre Passos**: Adicionado aviso no Passo 7 sobre modificação do
   `password.strategy.ts` (também alterado no Passo 5)
4. ✅ **Validação de Senha**: Adicionada validação de senha forte no
   `SignupDto` (mín 8 chars, 1 letra, 1 número, 1 caractere especial)
5. ✅ **Cookie Parser**: Adicionada configuração do `cookie-parser` no `main.ts`
6. ✅ **Template HTML**: Adicionado exemplo de template HTML responsivo para emails
7. ✅ **Estrutura Organization**: Expandida estrutura hexagonal do módulo `organization` com exemplos de código
8. ✅ **Métodos UserRepository**: Adicionados métodos necessários (`lockAccount`, `unlockAccount`, `updateIsLocked`,
   `resetLoginAttempts`)

---

## 1) Objetivo do plano

Evoluir o sistema de autenticação atual (signup/login básico com JWT) para um sistema robusto e completo que suporte:

- Refresh tokens com rotação automática e cleanup
- Validação de email obrigatória pós-signup
- Recuperação de senha via email
- Bloqueio automático de conta após tentativas falhas
- Multi-tenancy com isolamento por organização
- Rate limiting específico para endpoints de autenticação
- Auditoria completa de tentativas de login
- Notificações por email para eventos críticos

## 2) Premissas / decisões já tomadas

### Técnicas:

- Flyway para migrations, Prisma apenas como query builder
- JWT RS256 (access: 15min, refresh: 7 dias)
- Argon2 + pepper para senhas
- Nodemailer para emails (SMTP configurável)
- Cookies httpOnly para refresh tokens
- Rate limiting: global 30 req/min, auth endpoints 5 req/min
- Cleanup job diário às 03:00 UTC
- Timestamps sempre em UTC
- Mensagens de erro genéricas para não vazar informações

### Negócio:

- Access token: 15min, refresh token: 7 dias
- Email de confirmação: 24h, recuperação de senha: 1h
- Bloqueio após 5 tentativas em 15min, desbloqueio em 30min
- Máximo 10 refresh tokens ativos/usuário
- `SUPER_ADMIN` tem `organizationId: null` (acesso global)
- `USER` pertence a 1 organização

### Sequência de implementação:

1. Database schema (fundação)
2. Email service (infraestrutura)
3. Refresh tokens (core)
4. Login attempt tracking (auditoria)
5. Validação de email
6. Recuperação de senha
7. Bloqueio de conta
8. Multi-tenancy
9. Rate limiting
10. Cleanup jobs
11. Testes e documentação

## 3) Checklist de execução (passos pequenos e verificáveis)

### **Passo 1: Database Schema - Migrations Flyway**

**Intenção:** Criar tabelas `Organization` e `LoginAttempt`, adicionar campos em `User` (organizationId,
loginAttempts, lockedUntil, isLocked)

**Arquivos/áreas:**

- `flyway/migrations/V3__add_organization_and_auth_enhancements.sql`
- `prisma/schema.prisma` (atualizar após migration)

**Mudança mínima:**

```sql
-- V3__add_organization_and_auth_enhancements.sql

-- Tabela Organization
CREATE TABLE organizations
(
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255)                   NOT NULL,
  slug       VARCHAR(100) UNIQUE            NOT NULL,
  is_active  BOOLEAN          DEFAULT true  NOT NULL,
  created_at TIMESTAMP        DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP        DEFAULT NOW() NOT NULL
);

-- Adicionar campos em users
ALTER TABLE users
  ADD COLUMN organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL,
  ADD COLUMN login_attempts INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN locked_until TIMESTAMP NULL;

CREATE INDEX idx_users_organization_id ON users (organization_id);
CREATE INDEX idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;

-- Tabela LoginAttempt
CREATE TABLE login_attempts
(
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255)                   NOT NULL,
  user_id        UUID                           REFERENCES users (id) ON DELETE SET NULL,
  ip_address     VARCHAR(45)                    NOT NULL,
  user_agent     TEXT,
  success        BOOLEAN                        NOT NULL,
  failure_reason VARCHAR(100),
  timestamp      TIMESTAMP        DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_login_attempts_email ON login_attempts (email, timestamp);
CREATE INDEX idx_login_attempts_user_id ON login_attempts (user_id, timestamp);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts (timestamp);
```

**Como verificar:**

```bash
make db-migrate          # Aplicar migration
make db-info             # Verificar que V3 foi aplicada
make db-pull             # Sincronizar schema.prisma
make db-gen              # Gerar Prisma client
```

**Critério de pronto:**

- Migration V3 aplicada sem erros
- `prisma/schema.prisma` contém modelos `Organization`, `LoginAttempt` e campos novos em `User`
- Prisma client gerado com novos tipos

---

### **Passo 2: Email Service - Infraestrutura de Envio**

**Intenção:** Criar serviço de email com Nodemailer, templates HTML, e env vars para SMTP

**Arquivos/áreas:**

- `src/shared/email/` (novo módulo)
  - `email.service.ts`
  - `email.module.ts`
  - `interfaces/email-options.interface.ts`
  - `templates/` (HTML templates)
- `.env.example` (adicionar vars SMTP)
- `src/config/email.config.ts` (configuração)

**Mudança mínima:**

```typescript
// src/shared/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('SMTP_HOST'),
      port: configService.get<number>('SMTP_PORT'),
      secure: configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: configService.get<string>('SMTP_USER'),
        pass: configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to,
      subject: 'Verify your email address',
      html: this.getEmailVerificationTemplate(verificationUrl),
    });
    this.logger.log(`Email verification sent to ${to}`);
  }

  // Adicionar métodos: sendPasswordReset, sendAccountLocked, sendPasswordChanged

  private getEmailVerificationTemplate(url: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Verify your email address</h1>
        <p>Thank you for signing up! Please click the button below to verify your email address:</p>
        <a href="${url}"
           style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #007bff;
                  color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </body>
      </html>
    `;
  }
}
```

**Dependências:**

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

**Como verificar:**

```bash
# Adicionar env vars no .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=test@example.com
SMTP_PASS=test
SMTP_FROM="App <noreply@app.com>"
FRONTEND_URL=http://localhost:5173

# Rodar testes unitários
npm test -- email.service.spec.ts

# Teste manual (criar endpoint temporário /test/email)
curl -X POST http://localhost:3000/test/email
```

**Critério de pronto:**

- EmailService criado com métodos: `sendEmailVerification`, `sendPasswordReset`, `sendAccountLocked`,
  `sendPasswordChanged`
- Templates HTML criados em `src/shared/email/templates/`
- Env vars SMTP configuradas
- Teste unitário passa (mock do transporter)
- Teste manual envia email com sucesso (se SMTP configurado)

---

### **Passo 3: Refresh Tokens - Emissão, Persistência e Rotação**

**Intenção:
** Implementar lógica de refresh tokens com rotação automática, limite de 10 tokens ativos, e armazenamento hasheado

**Arquivos/áreas:**

- `src/modules/auth/domain/models/refresh-token.model.ts` (novo)
- `src/modules/auth/domain/ports/refresh-token-repository.port.ts` (novo)
- `src/modules/auth/infra/repositories/refresh-token.repository.ts` (novo)
- `src/modules/auth/application/services/token.service.ts` (novo)
- `src/modules/auth/application/services/auth.service.ts` (atualizar)
- `src/modules/auth/presentation/controllers/auth.controller.ts` (adicionar endpoints)
- `src/modules/auth/application/dtos/refresh-token.dto.ts` (novo)

**Mudança mínima:**

1. Repository port:

```typescript
// refresh-token-repository.port.ts
export interface RefreshTokenRepositoryPort {
  create(refreshToken: RefreshTokenModel): Promise<RefreshTokenModel>;

  findByJti(jti: string): Promise<RefreshTokenModel | null>;

  findActiveByUserId(userId: string): Promise<RefreshTokenModel[]>;

  revokeByJti(jti: string, reason: string, replacedByJti?: string): Promise<void>;

  revokeAllByUserId(userId: string, reason: string): Promise<void>;

  deleteExpired(): Promise<number>;

  deleteOldestByUserId(userId: string, keep: number): Promise<void>;
}
```

2. TokenService:

```typescript
// token.service.ts
@Injectable()
export class TokenService {
  async generateRefreshToken(userId: string, metadata: { deviceId?, ipAddress?, userAgent? }): Promise<string> {
    const jti = randomUUID();
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await this.refreshTokenRepository.create({
      userId,
      jti,
      tokenHash,
      expiresAt,
      ...metadata,
    });

    return `${jti}.${token}`; // JTI + token separados por ponto
  }

  async rotateRefreshToken(oldTokenString: string, metadata): Promise<string> {
    const [jti, token] = oldTokenString.split('.');
    const storedToken = await this.refreshTokenRepository.findByJti(jti);

    // Validar hash, expiração, revogação
    // Se revogado: detectar possível roubo, invalidar todos
    // Se válido: gerar novo token, revogar anterior

    await this.refreshTokenRepository.deleteOldestByUserId(userId, 10); // Manter apenas 10
    return newToken;
  }
}
```

3. AuthService (atualizar login):

```typescript
// IMPORTANTE: Este método substitui o login atual que retorna apenas accessToken
// O controller deve ser atualizado para setar refresh token em cookie httpOnly
async
login(payload
:
JwtPayloadModel, metadata
):
Promise < { accessToken, refreshToken } > {
  const accessToken = this.jwtService.sign(payload);
  const refreshToken = await this.tokenService.generateRefreshToken(payload.userId, metadata);
  return { accessToken, refreshToken };
}
```

4. Controller (adicionar endpoints):

```typescript
@Post('/refresh')
async
refresh(@Req()
req, @Res()
res
)
{
  const oldRefreshToken = req.cookies.refreshToken;
  const { accessToken, refreshToken } = await this.authService.refresh(oldRefreshToken, metadata);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ accessToken });
}

@Post('/logout')
async
logout(@Req()
req, @Res()
res
)
{
  await this.authService.logout(req.cookies.refreshToken);
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
}
```

**Dependências:**

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

**Configuração:**

```typescript
// main.ts
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // ADICIONAR para parsear cookies
  // ...
  await app.listen(3000);
}
```

**Como verificar:**

```bash
# Testes unitários
npm test -- token.service.spec.ts
npm test -- auth.service.spec.ts

# Teste E2E
npm run test:e2e -- auth.e2e-spec.ts

# Manual:
# IMPORTANTE: Antes de implementar, verificar que /login atual retorna apenas { accessToken }
# 1. Login: POST /v1/auth/login -> verificar que retorna { accessToken } + cookie httpOnly refreshToken
# 2. Verificar no DevTools -> Application -> Cookies que refreshToken está presente com flags httpOnly, secure, sameSite
# 3. Refresh: POST /v1/auth/refresh -> verificar novo accessToken e novo refreshToken (rotacionado)
# 4. Logout: POST /v1/auth/logout -> verificar cookie removido
# 5. Tentar usar refresh token após logout: deve retornar 401
# 6. Login com 10 dispositivos diferentes -> 11º login deve remover o refresh token mais antigo
```

**Critério de pronto:**

- RefreshToken repository implementado
- TokenService com `generateRefreshToken`, `rotateRefreshToken`, `validateRefreshToken`
- Login retorna access token (JSON) + refresh token (cookie httpOnly)
- Endpoint `/refresh` rotaciona tokens corretamente
- Endpoint `/logout` invalida refresh token
- Teste detecta roubo de token (tentar usar token revogado invalida todos)
- Limite de 10 tokens ativos funcionando
- Testes unitários e E2E passando

---

### **Passo 4: Login Attempt Tracking - Auditoria**

**Intenção:** Registrar todas as tentativas de login (sucesso/falha) na tabela `LoginAttempt` para auditoria

**Arquivos/áreas:**

- `src/modules/auth/domain/models/login-attempt.model.ts` (novo)
- `src/modules/auth/domain/ports/login-attempt-repository.port.ts` (novo)
- `src/modules/auth/infra/repositories/login-attempt.repository.ts` (novo)
- `src/modules/auth/application/services/auth.service.ts` (atualizar)
- `src/modules/auth/infra/adapters/credentials/password.strategy.ts` (atualizar)

**Mudança mínima:**

```typescript
// login-attempt-repository.port.ts
export interface LoginAttemptRepositoryPort {
  create(attempt: LoginAttemptModel): Promise<LoginAttemptModel>;

  countRecentFailuresByUserId(userId: string, withinMinutes: number): Promise<number>;

  deleteOlderThan(days: number): Promise<number>;
}

// auth.service.ts - adicionar método
async
recordLoginAttempt(email
:
string, userId
:
string | null, success
:
boolean, metadata
):
Promise < void > {
  await this.loginAttemptRepository.create({
    email,
    userId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    success,
    failureReason: success ? null : 'Invalid credentials',
    timestamp: new Date(),
  });

  this.logger.log(`Login attempt recorded - email: ${email}, success: ${success}`);
}

// password.strategy.ts - chamar recordLoginAttempt
async
validate(email
:
string, password
:
string
):
Promise < JwtPayloadModel > {
  try {
    const user = await this.userRepository.findByEmail(email);
    if(!user || !this.hashService.verify(password, user.passwordHash)
)
{
  await this.authService.recordLoginAttempt(email, user?.id, false, metadata);
  throw new UnauthorizedException('Invalid credentials');
}

await this.authService.recordLoginAttempt(email, user.id, true, metadata);
return { userId: user.id, email: user.email, roles: user.roles };
} catch
(error)
{
  // Log e throw
}
}
```

**Como verificar:**

```bash
# Testes unitários
npm test -- login-attempt.repository.spec.ts
npm test -- auth.service.spec.ts

# Manual:
# 1. Fazer login com sucesso
# 2. Verificar registro no banco: SELECT * FROM login_attempts WHERE success = true;
# 3. Fazer login com senha errada
# 4. Verificar registro: SELECT * FROM login_attempts WHERE success = false;
```

**Critério de pronto:**

- LoginAttempt repository implementado
- Toda tentativa de login (sucesso/falha) gera registro em `login_attempts`
- Logs estruturados registram tentativas
- Query `countRecentFailuresByUserId` retorna corretamente
- Testes unitários passando

---

### **Passo 5: Validação de Email - Signup e Confirmação**

**Intenção:** Exigir validação de email após signup, enviar email de confirmação, bloquear login até verificação

**Arquivos/áreas:**

- `src/modules/auth/application/services/auth.service.ts` (atualizar signup e adicionar verifyEmail)
- `src/modules/auth/presentation/controllers/auth.controller.ts` (adicionar endpoints)
- `src/modules/auth/application/dtos/verify-email.dto.ts` (novo)
- `src/modules/auth/infra/adapters/credentials/password.strategy.ts` (validar emailVerified)

**Mudança mínima:**

```typescript
// auth.service.ts
async
signup(signupDto
:
SignupDto
):
Promise < { userId: string } > {
  await this.verifyEmailIsAvailable(signupDto.email);

  const hashedPassword = this.hashService.hash(signupDto.password);
  const newUser = UserModel.create({
    email: signupDto.email,
    password: hashedPassword,
    fullName: signupDto.fullName,
    roles: [RoleEnum.USER],
    emailVerified: false, // Importante
  });

  const user = await this.userRepository.createUser(newUser);

  // Gerar token de verificação (JWT com tipo 'email_verification', exp 24h)
  const verificationToken = this.jwtService.sign(
    { userId: user.id, type: 'email_verification' },
    { expiresIn: '24h' }
  );

  // Enviar email
  await this.emailService.sendEmailVerification(user.email, verificationToken);

  this.logger.log(`User signed up - userId: ${user.id}, email verification sent`);
  return { userId: user.id };
}

async
verifyEmail(token
:
string
):
Promise < void > {
  try {
    const payload = this.jwtService.verify(token);

    if(payload.type !== 'email_verification'
)
{
  throw new BadRequestException('Invalid token type');
}

await this.userRepository.updateEmailVerified(payload.userId, true);
this.logger.log(`Email verified successfully - userId: ${payload.userId}`);
} catch
(error)
{
  if (error.name === 'TokenExpiredError') {
    throw new BadRequestException('Verification link expired. Please request a new one.');
  }
  throw new BadRequestException('Invalid verification token');
}
}

async
resendVerification(email
:
string
):
Promise < void > {
  const user = await this.userRepository.findByEmail(email);

  if(!
user
)
{
  // Não vazar se email existe, retornar sucesso genérico
  this.logger.warn(`Verification resend requested for non-existent email: ${email}`);
  return;
}

if (user.emailVerified) {
  throw new BadRequestException('Email already verified');
}

const token = this.jwtService.sign(
  { userId: user.id, type: 'email_verification' },
  { expiresIn: '24h' }
);

await this.emailService.sendEmailVerification(user.email, token);
this.logger.log(`Verification email resent - userId: ${user.id}`);
}

// password.strategy.ts - validar emailVerified
async
validate(email
:
string, password
:
string
):
Promise < JwtPayloadModel > {
  const user = await this.userRepository.findByEmail(email);

  if(!
user || !this.hashService.verify(password, user.passwordHash)
)
{
  throw new UnauthorizedException('Invalid credentials');
}

if (!user.emailVerified) {
  throw new UnauthorizedException('Please verify your email before logging in');
}

// Continue...
}
```

**Como verificar:**

```bash
# Testes unitários
npm test -- auth.service.spec.ts

# Teste E2E
npm run test:e2e -- auth.e2e-spec.ts

# Manual:
# 1. Signup: POST /v1/auth/signup -> verificar email recebido
# 2. Tentar login sem verificar: deve retornar 401 "Please verify your email"
# 3. Verificar email: POST /v1/auth/verify-email com token
# 4. Login novamente: deve funcionar
# 5. Testar link expirado (aguardar 24h ou forçar token expirado)
# 6. Reenviar verificação: POST /v1/auth/resend-verification
```

**Critério de pronto:**

- Signup cria usuário com `emailVerified: false` e envia email
- Login bloqueado se `emailVerified: false`
- Endpoint `/verify-email` marca `emailVerified: true`
- Endpoint `/resend-verification` reenvia email (rate limit 1/5min via Throttler)
- Token expirado retorna erro claro
- Testes E2E validando fluxo completo

---

### **Passo 6: Recuperação de Senha - Forgot/Reset Password**

**Intenção:
** Implementar fluxo de recuperação de senha via email com link expirável (1h) e invalidação de refresh tokens

**Arquivos/áreas:**

- `src/modules/auth/application/services/auth.service.ts` (adicionar métodos)
- `src/modules/auth/presentation/controllers/auth.controller.ts` (adicionar endpoints)
- `src/modules/auth/application/dtos/forgot-password.dto.ts` (novo)
- `src/modules/auth/application/dtos/reset-password.dto.ts` (novo)

**Mudança mínima:**

```typescript
// auth.service.ts
async
forgotPassword(email
:
string
):
Promise < void > {
  const user = await this.userRepository.findByEmail(email);

  if(!
user
)
{
  // Não vazar se email existe
  this.logger.warn(`Password reset requested for non-existent email: ${email}`);
  return;
}

const resetToken = this.jwtService.sign(
  { userId: user.id, type: 'password_reset' },
  { expiresIn: '1h' }
);

await this.emailService.sendPasswordReset(user.email, resetToken);
this.logger.log(`Password reset email sent - userId: ${user.id}`);
}

async
resetPassword(token
:
string, newPassword
:
string
):
Promise < void > {
  try {
    const payload = this.jwtService.verify(token);

    if(payload.type !== 'password_reset'
)
{
  throw new BadRequestException('Invalid token type');
}

const hashedPassword = this.hashService.hash(newPassword);
await this.userRepository.updatePassword(payload.userId, hashedPassword);

// Invalidar todos os refresh tokens do usuário
await this.refreshTokenRepository.revokeAllByUserId(payload.userId, 'password_reset');

// Enviar email de confirmação
const user = await this.userRepository.findById(payload.userId);
await this.emailService.sendPasswordChanged(user.email);

this.logger.log(`Password reset successfully - userId: ${payload.userId}`);
} catch
(error)
{
  if (error.name === 'TokenExpiredError') {
    throw new BadRequestException('Reset link expired. Please request a new one.');
  }
  throw new BadRequestException('Invalid reset token');
}
}
```

**Como verificar:**

```bash
# Testes unitários
npm test -- auth.service.spec.ts

# Teste E2E
npm run test:e2e -- auth.e2e-spec.ts

# Manual:
# 1. Solicitar recuperação: POST /v1/auth/forgot-password {"email": "..."}
# 2. Verificar email recebido com link
# 3. Resetar senha: POST /v1/auth/reset-password {"token": "...", "newPassword": "..."}
# 4. Verificar email de confirmação recebido
# 5. Tentar usar refresh token antigo: deve retornar 401
# 6. Login com nova senha: deve funcionar
```

**Critério de pronto:**

- Endpoint `/forgot-password` envia email com token (1h expiração)
- Endpoint `/reset-password` atualiza senha e invalida todos refresh tokens
- Email de confirmação enviado após reset
- Token expirado retorna erro claro
- Rate limit 1 email/5min por IP
- Testes E2E validando fluxo completo

---

### **Passo 7: Bloqueio de Conta - Brute Force Protection**

**Intenção:
** Bloquear conta após 5 tentativas falhas em 15min, enviar email de notificação, desbloqueio automático em 30min

**⚠️ ATENÇÃO:** Este passo modifica `password.strategy.ts` que foi alterado no **Passo 5
** (validação de emailVerified). As mudanças devem ser integradas incrementalmente:

1. Validação de emailVerified (Passo 5)
2. Verificação de lockout (este passo)
3. Contagem de tentativas falhas (este passo)

**Arquivos/áreas:**

- `src/modules/auth/application/services/auth.service.ts` (adicionar lógica de bloqueio)
- `src/modules/auth/infra/adapters/credentials/password.strategy.ts` (verificar lockout) ⚠️ **Modificado no Passo 5**
- `src/modules/user/domain/ports/user-repository.port.ts` (adicionar métodos)

**Mudança mínima:**

```typescript
// auth.service.ts
async
handleFailedLoginAttempt(userId
:
string, email
:
string
):
Promise < void > {
  const user = await this.userRepository.findById(userId);

  const recentFailures = await this.loginAttemptRepository.countRecentFailuresByUserId(
    userId,
    15 // últimos 15 minutos
  );

  if(recentFailures >= 4
)
{ // 5ª tentativa falha
  const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30min
  await this.userRepository.lockAccount(userId, lockedUntil);
  await this.userRepository.updateIsLocked(userId, false); // Bloquear conta

  await this.emailService.sendAccountLocked(email, lockedUntil);

  this.logger.warn(`Account locked due to failed login attempts - userId: ${userId}`);
  throw new UnauthorizedException('Account locked. Please try again in 30 minutes or contact support.');
}
}

async
checkIfAccountLocked(user
:
UserModel
):
Promise < void > {
  if(user.lockedUntil && user.lockedUntil > new Date()
)
{
  const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
  throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes.`);
}

// Se lockedUntil passou, resetar e reativar conta
if (user.lockedUntil && user.lockedUntil <= new Date()) {
  await this.userRepository.unlockAccount(user.id);
  await this.userRepository.updateIsLocked(user.id, true); // Reativar conta
  this.logger.log(`Account automatically unlocked - userId: ${user.id}`);
}
}

// password.strategy.ts
// ATENÇÃO: Este arquivo também foi modificado no Passo 5 (validação de emailVerified)
// As mudanças devem ser integradas incrementalmente
async
validate(email
:
string, password
:
string
):
Promise < JwtPayloadModel > {
  const user = await this.userRepository.findByEmail(email);

  if(!
user
)
{
  await this.authService.recordLoginAttempt(email, null, false, metadata);
  throw new UnauthorizedException('Invalid credentials');
}

// Verificar lockout antes de validar senha
await this.authService.checkIfAccountLocked(user);

if (!this.hashService.verify(password, user.passwordHash)) {
  await this.authService.recordLoginAttempt(email, user.id, false, metadata);
  await this.authService.handleFailedLoginAttempt(user.id, email);
  throw new UnauthorizedException('Invalid credentials');
}

// Sucesso: resetar loginAttempts
await this.userRepository.resetLoginAttempts(user.id);
await this.authService.recordLoginAttempt(email, user.id, true, metadata);

// Continue...
}

// user-repository.port.ts - Adicionar métodos necessários
export interface UserRepositoryPort {
  // ... métodos existentes
  lockAccount(userId: string, lockedUntil: Date): Promise<void>;

  unlockAccount(userId: string): Promise<void>;

  updateIsLocked(userId: string, isLocked: boolean): Promise<void>;

  resetLoginAttempts(userId: string): Promise<void>;
}
```

**Como verificar:**

```bash
# Testes unitários
npm test -- auth.service.spec.ts

# Teste E2E
npm run test:e2e -- auth-lockout.e2e-spec.ts

# Manual:
# 1. Fazer 5 tentativas de login com senha errada
# 2. Verificar que conta foi bloqueada e email foi enviado
# 3. Tentar login com senha correta: deve retornar "Account locked"
# 4. Verificar no banco: SELECT locked_until FROM users WHERE email = '...';
# 5. Aguardar 30min (ou forçar) e tentar login: deve funcionar
```

**Critério de pronto:**

- Conta bloqueada após 5 tentativas falhas em 15min
- Campo `isLocked` setado para `true` ao bloquear
- Campo `isLocked` setado para `false` ao desbloquear automaticamente
- Email de notificação enviado ao bloquear
- Login bloqueado retorna mensagem clara com tempo restante
- Desbloqueio automático após 30min
- `loginAttempts` resetado após login bem-sucedido
- Métodos `lockAccount`, `unlockAccount`, `updateIsLocked`, `resetLoginAttempts` implementados no UserRepository
- Testes E2E simulando lockout

---

### **Passo 8: Multi-tenancy - Organizações e Isolamento**

**Intenção:** Implementar isolamento por organização, adicionar `organizationId` em signup, validar acesso em guards

**Arquivos/áreas:**

- `src/modules/organization/` (novo módulo completo seguindo arquitetura hexagonal)
  ```
  organization/
    domain/
      models/organization.model.ts
      ports/organization-repository.port.ts
    application/
      services/organization.service.ts
      dtos/create-organization.dto.ts
      dtos/update-organization.dto.ts
    infra/
      repositories/organization.repository.ts
    presentation/
      controllers/organization.controller.ts
    organization.module.ts
  ```
- `src/modules/auth/application/dtos/signup.dto.ts` (adicionar organizationId com validação)
- `src/modules/auth/application/services/auth.service.ts` (validar organizationId no signup)
- `src/shared/guards/organization.guard.ts` (novo - isolamento multi-tenancy)
- `scripts/seed.ts` (criar SUPER_ADMIN e org inicial)

**Mudança mínima:**

1. SignupDto (adicionar validação de senha forte):

```typescript
import { IsEmail, IsString, IsUUID, IsOptional, MinLength, Matches } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'Password must contain at least 8 characters, 1 letter, 1 number, and 1 special character',
  })
  password: string;

  @IsString()
  fullName: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string; // Obrigatório se não for SUPER_ADMIN
}
```

2. AuthService signup:

```typescript
async
signup(signupDto
:
SignupDto
):
Promise < { userId: string } > {
  // Validar que organizationId foi fornecido (exceto para SUPER_ADMIN manual)
  if(!
signupDto.organizationId
)
{
  throw new BadRequestException('Organization ID is required');
}

// Verificar que organização existe
const org = await this.organizationRepository.findById(signupDto.organizationId);
if (!org || !org.isActive) {
  throw new BadRequestException('Invalid organization');
}

// Continue signup...
const newUser = UserModel.create({
  ...signupDto,
  organizationId: signupDto.organizationId,
});
}
```

3. OrganizationGuard:

```typescript

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JwtPayloadModel

    // SUPER_ADMIN tem acesso global
    if (user.roles.includes(RoleEnum.SUPER_ADMIN)) {
      return true;
    }

    // Extrair organizationId do request (params, query, body)
    const requestedOrgId = request.params.organizationId || request.query.organizationId;

    if (!requestedOrgId) {
      throw new ForbiddenException('Organization ID required');
    }

    if (user.organizationId !== requestedOrgId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return true;
  }
}
```

4. OrganizationService (exemplo):

```typescript
// organization.service.ts
@Injectable()
export class OrganizationService {
  constructor(private organizationRepository: OrganizationRepositoryPort) {
  }

  async create(createDto: CreateOrganizationDto): Promise<OrganizationModel> {
    // Validar que slug é único
    const existing = await this.organizationRepository.findBySlug(createDto.slug);
    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    const organization = OrganizationModel.create(createDto);
    return await this.organizationRepository.create(organization);
  }

  async findAll(): Promise<OrganizationModel[]> {
    return await this.organizationRepository.findAll();
  }

  async findById(id: string): Promise<OrganizationModel | null> {
    return await this.organizationRepository.findById(id);
  }
}
```

5. OrganizationController (exemplo):

```typescript
// organization.controller.ts
@ApiTags('Organizations')
@Controller('/organizations')
@UseGuards(JwtAuthGuard, RolesGuard(RoleEnum.SUPER_ADMIN)) // Apenas SUPER_ADMIN
export class OrganizationController {
  constructor(private service: OrganizationService) {
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization (SUPER_ADMIN only)' })
  async create(@Body() createDto: CreateOrganizationDto) {
    return await this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations (SUPER_ADMIN only)' })
  async findAll() {
    return await this.service.findAll();
  }
}
```

6. Seed script:

```typescript
// scripts/seed.ts
async function seed() {
  // Criar organização inicial
  const org = await prisma.organization.create({
    data: {
      name: 'Default Organization',
      slug: 'default',
      isActive: true,
    },
  });

  // Criar SUPER_ADMIN (Anderson Santo)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'anderson.santo@caju.com.br',
      fullName: 'Anderson Santo',
      passwordHash: hashPassword('ChangeMe123!'),
      emailVerified: true,
      organizationId: null, // SUPER_ADMIN não pertence a org
      roles: {
        create: { name: 'SUPER_ADMIN' },
      },
    },
  });

  console.log('Seed completed:', { org, superAdmin });
}
```

**Como verificar:**

```bash
# Rodar seed
make db-seed

# Testes unitários
npm test -- organization.service.spec.ts
npm test -- organization.guard.spec.ts

# Manual:
# 1. Criar org via SUPER_ADMIN: POST /v1/organizations {"name": "Org A", "slug": "org-a"}
# 2. Signup usuário na org A: POST /v1/auth/signup {"organizationId": "..."}
# 3. Login como USER da org A
# 4. Tentar acessar dados da org B: deve retornar 403
# 5. Login como SUPER_ADMIN
# 6. Acessar dados de qualquer org: deve funcionar
```

**Critério de pronto:**

- Modelo `Organization` criado
- Signup exige `organizationId` (exceto SUPER_ADMIN)
- Signup valida senha forte (mín 8 chars, 1 letra, 1 número, 1 caractere especial)
- `OrganizationGuard` bloqueia acesso cross-org
- SUPER_ADMIN tem acesso global (`organizationId: null`)
- Seed script cria SUPER_ADMIN e org inicial
- Testes E2E validando isolamento e rejeição de senhas fracas

---

### **Passo 9: Rate Limiting Específico - Auth Endpoints**

**Intenção:** Aplicar rate limiting de 5 req/min por IP nos endpoints de autenticação

**Arquivos/áreas:**

- `src/main.ts` (configurar ThrottlerModule globalmente)
- `src/modules/auth/presentation/controllers/auth.controller.ts` (decorators)
- `package.json` (adicionar @nestjs/throttler)

**Mudança mínima:**

```typescript
// main.ts (já tem ThrottlerModule global 30/min)
// Adicionar override específico nos controllers

// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('/auth')
export class AuthController {

  @Post('/signup')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
  async signup(@Body() signupDto: SignupDto) {
    return await this.service.signup(signupDto);
  }

  @Post('/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(PasswordAuthGuard)
  async login(@AuthenticatedUser() user: JwtPayloadModel) {
    return await this.service.login(user);
  }

  @Post('/forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.service.forgotPassword(dto.email);
    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  @Post('/resend-verification')
  @Throttle({ default: { limit: 1, ttl: 300000 } }) // 1 req/5min
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.service.resendVerification(dto.email);
    return { message: 'Verification email sent. Please check your inbox.' };
  }
}
```

**Como verificar:**

```bash
# Teste manual (usar script ou Postman)
# 1. Fazer 6 requests consecutivos em /auth/login
# 2. Verificar que 6º retorna 429 Too Many Requests

# Teste E2E
npm run test:e2e -- rate-limit.e2e-spec.ts
```

**Critério de pronto:**

- Endpoints `/signup`, `/login`, `/forgot-password`: 5 req/min por IP
- Endpoint `/resend-verification`: 1 req/5min por IP
- 6º request em < 1min retorna 429
- Testes E2E validando rate limiting

---

### **Passo 10: Cleanup Jobs - Cron para Tokens Expirados e Login Attempts Antigos**

**Intenção:** Criar jobs cron diários para remover refresh tokens expirados e login attempts antigos (> 60 dias)

**Arquivos/áreas:**

- `src/modules/auth/application/services/cleanup.service.ts` (novo)
- `src/modules/auth/auth.module.ts` (registrar ScheduleModule)

**Mudança mínima:**

```typescript
// cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private refreshTokenRepository: RefreshTokenRepositoryPort,
    private loginAttemptRepository: LoginAttemptRepositoryPort,
  ) {
  }

  @Cron('0 3 * * *', { timeZone: 'UTC' }) // Diariamente às 03:00 UTC
  async cleanupExpiredRefreshTokens() {
    this.logger.log('Starting cleanup of expired refresh tokens...');
    const deleted = await this.refreshTokenRepository.deleteExpired();
    this.logger.log(`Cleanup completed - ${deleted} expired tokens removed`);
  }

  @Cron('0 4 * * *', { timeZone: 'UTC' }) // Diariamente às 04:00 UTC
  async cleanupOldLoginAttempts() {
    this.logger.log('Starting cleanup of old login attempts...');
    const deleted = await this.loginAttemptRepository.deleteOlderThan(60); // > 60 dias
    this.logger.log(`Cleanup completed - ${deleted} old login attempts removed`);
  }
}

// auth.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ],
  providers: [
    CleanupService,
    // ...
  ],
})
export class AuthModule {
}
```

**Dependências:**

```bash
npm install @nestjs/schedule
```

**Como verificar:**

```bash
# Teste manual (forçar execução):
# 1. Adicionar endpoint temporário que chama os métodos diretamente
# 2. Criar tokens expirados no banco manualmente
# 3. Chamar cleanup
# 4. Verificar que tokens foram removidos

# Teste unitário
npm test -- cleanup.service.spec.ts

# Verificar logs no dia seguinte
# Logs devem mostrar "Cleanup completed - X tokens removed"
```

**Critério de pronto:**

- Cron job roda diariamente às 03:00 UTC (refresh tokens)
- Cron job roda diariamente às 04:00 UTC (login attempts > 60 dias)
- Logs estruturados registram execução
- Teste unitário com mock de cron

---

### **Passo 11: Testes Unitários e E2E - Cobertura >= 90%**

**Intenção:** Garantir cobertura de testes >= 90% em módulos críticos (AuthService, guards, strategies, repositories)

**Arquivos/áreas:**

- `src/modules/auth/**/*.spec.ts` (atualizar todos)
- `test/auth.e2e-spec.ts` (criar/atualizar)

**Mudança mínima:**

Criar/atualizar testes para cobrir:

1. **AuthService:**

- signup (com/sem organizationId, email duplicado)
- login (sucesso, email não verificado, conta bloqueada)
- refresh (rotação, token expirado, token revogado, detecção de roubo)
- logout (invalidação)
- verifyEmail (sucesso, token expirado)
- resendVerification (rate limit)
- forgotPassword (email existe/não existe)
- resetPassword (sucesso, token expirado, invalidação de refresh tokens)
- handleFailedLoginAttempt (bloqueio após 5 tentativas)
- checkIfAccountLocked (bloqueio, desbloqueio automático)

2. **TokenService:**

- generateRefreshToken (limite 10 tokens)
- rotateRefreshToken (rotação, validação hash)
- validateRefreshToken (detecção de roubo)

3. **Guards:**

- JwtAuthGuard (token válido/inválido/expirado)
- PasswordAuthGuard (email/senha, email não verificado, conta bloqueada)
- OrganizationGuard (SUPER_ADMIN, USER cross-org, USER mesma org)

4. **Repositories:**

- RefreshTokenRepository (CRUD, cleanup, deleteOldest)
- LoginAttemptRepository (create, countRecent, deleteOld)
- OrganizationRepository (CRUD)

5. **E2E:**

- Signup + verificação de email + login
- Login + refresh + logout
- Recuperação de senha completa
- Bloqueio após 5 tentativas falhas
- Multi-tenancy (isolamento cross-org)
- Rate limiting (6º request retorna 429)

**Como verificar:**

```bash
# Testes unitários
npm test

# Cobertura
npm run test:cov

# Verificar cobertura >= 90% em:
# - src/modules/auth/application/services/auth.service.ts
# - src/modules/auth/application/services/token.service.ts
# - src/modules/auth/infra/adapters/credentials/*.ts
# - src/modules/auth/infra/repositories/*.ts

# Testes E2E
npm run test:e2e

# Todos os testes devem passar
```

**Critério de pronto:**

- Coverage >= 90% em módulos críticos
- 100% dos testes unitários passando
- 100% dos testes E2E passando
- Nenhum log contendo senhas ou tokens em plaintext
- Todos os edge cases do PRD cobertos por testes

---

### **Passo 12: Documentação Swagger e README**

**Intenção:** Atualizar Swagger com todos os novos endpoints e atualizar README com mudanças críticas

**Arquivos/áreas:**

- `src/modules/auth/presentation/controllers/auth.controller.ts` (decorators Swagger)
- `README.md` (adicionar seção de autenticação)

**Mudança mínima:**

```typescript
// auth.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiCookieAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('/auth')
export class AuthController {

  @Post('/signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'User created. Verification email sent.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  async signup(@Body() signupDto: SignupDto) {
    // ...
  }

  @Post('/login')
  @ApiOperation({ summary: 'Authenticate user and issue tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful. Refresh token set in cookie.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or email not verified.' })
  async login(@Body() loginDto: LoginDto, @Req() req, @Res() res) {
    // ...
  }

  @Post('/refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({ status: 200, description: 'New access token issued.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refresh(@Req() req, @Res() res) {
    // ...
  }

  // Adicionar decorators para todos os endpoints
}
```

README.md:

```markdown
## Authentication

### Features

- JWT RS256 authentication (access token: 15min, refresh token: 7 days)
- Email verification required for signup
- Password recovery via email
- Account lockout after 5 failed login attempts in 15min
- Multi-tenancy with organization-based isolation
- Refresh token rotation for security
- Rate limiting (5 req/min on auth endpoints)
- Audit logging of all login attempts

### Endpoints

- `POST /v1/auth/signup` - Register new user
- `POST /v1/auth/login` - Login and get tokens
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout and invalidate refresh token
- `POST /v1/auth/verify-email` - Verify email with token
- `POST /v1/auth/resend-verification` - Resend verification email
- `POST /v1/auth/forgot-password` - Request password reset
- `POST /v1/auth/reset-password` - Reset password with token

See `/api` for full Swagger documentation.

### Environment Variables

```bash
# SMTP Configuration (required for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="App <noreply@app.com>"

# Frontend URL for email links
FRONTEND_URL=http://localhost:5173
```

### Initial Setup

```bash
# Generate JWT keys
make keys

# Setup database and run seed (creates SUPER_ADMIN)
make db-setup
make db-seed
```

```

**Como verificar:**
```bash
# Iniciar aplicação
make start

# Acessar Swagger
open http://localhost:3000/api

# Verificar que todos os endpoints de autenticação estão documentados
# Verificar exemplos de request/response
# Testar endpoints via Swagger UI
```

**Critério de pronto:**

- Todos os endpoints de autenticação documentados no Swagger
- Exemplos de request/response corretos
- README atualizado com seção de autenticação
- Variáveis de ambiente SMTP documentadas
- Swagger UI funcional em `/api`

---

## 4) Riscos e mitigação

### Risco 1: SMTP não configurado em ambiente de desenvolvimento

**Impacto:** Emails não são enviados, impossibilitando testes de verificação de email e recuperação de senha
**Mitigação:**

- Adicionar mock de EmailService em testes
- Documentar claramente no README como configurar SMTP de teste (Gmail App Password, Mailtrap, etc.)
- Considerar adicionar flag `SKIP_EMAIL=true` em dev para bypass temporário

### Risco 2: Performance do cleanup job com milhões de registros

**Impacto:** Job de cleanup pode travar por muito tempo ou consumir muita memória
**Mitigação:**

- Implementar cleanup em batches (DELETE LIMIT 1000)
- Adicionar índices em `expiresAt` e `timestamp`
- Monitorar duração do job via logs

### Risco 3: Clock skew entre servidor e cliente causando falha de validação de tokens

**Impacto:** Tokens válidos rejeitados ou aceitos indevidamente
**Mitigação:**

- Usar UTC em todos os timestamps
- Adicionar margem de ±5min na validação de expiração
- Documentar importância de NTP nos servidores

### Risco 4: Quebra de compatibilidade com front-end ao mudar formato de tokens

**Impacto:** Front-end existente para de funcionar após deploy
**Mitigação:**

- Coordenar mudanças com time de front-end
- Adicionar versão de API (`/v1/auth`)
- Deploy incremental: liberar endpoints novos sem quebrar os antigos

### Risco 5: Vazamento de informações sensíveis em logs

**Impacto:** Senhas, tokens ou dados pessoais expostos em logs
**Mitigação:**

- Code review rigoroso em PRs
- Adicionar testes que verificam conteúdo de logs
- Usar sanitização automática no logger (filtrar campos `password`, `token`, etc.)

### Risco 6: Race condition em bloqueio de conta com login simultâneo

**Impacto:** Conta pode ser bloqueada/desbloqueada incorretamente
**Mitigação:**

- Usar transações no banco ao incrementar `loginAttempts` e verificar lockout
- Adicionar lock pessimista (`FOR UPDATE`) ao ler usuário para validação

### Risco 7: Divergência entre PRD e implementação inicial

**Impacto:** PRD menciona bloquear conta via `isActive: false`, mas código atual usa apenas `lockedUntil`
**Mitigação:**

- Passo 7 atualiza AMBOS os campos: `lockedUntil` (timer de desbloqueio) e `isLocked: true` (bloqueia conta)
- No desbloqueio automático, setar `isLocked: false` novamente (desbloqueia conta)
- Testes E2E devem validar que `isLocked` é atualizado corretamente

## 5) Definition of Done (checklist)

- [ ] **Database:**
  - [ ] Migration V3 aplicada com sucesso
  - [ ] Tabelas `Organization`, `LoginAttempt` criadas
  - [ ] Campos `organizationId`, `loginAttempts`, `lockedUntil`, `isLocked` adicionados em `User`
  - [ ] Prisma schema sincronizado e client gerado

- [ ] **Email Service:**
  - [ ] EmailService implementado com Nodemailer
  - [ ] Templates HTML criados (verification, reset, locked, changed)
  - [ ] Env vars SMTP documentadas
  - [ ] Testes unitários com mock do transporter

- [ ] **Refresh Tokens:**
  - [ ] RefreshTokenRepository implementado
  - [ ] TokenService com geração, rotação, validação
  - [ ] Login retorna access token (JSON) + refresh token (cookie httpOnly)
  - [ ] Endpoint `/refresh` rotaciona tokens
  - [ ] Endpoint `/logout` invalida tokens
  - [ ] Detecção de roubo de token funciona
  - [ ] Limite de 10 tokens ativos por usuário

- [ ] **Login Attempt Tracking:**
  - [ ] LoginAttemptRepository implementado
  - [ ] Todas as tentativas de login registradas
  - [ ] Query `countRecentFailuresByUserId` funciona

- [ ] **Validação de Email:**
  - [ ] Signup envia email de confirmação
  - [ ] Login bloqueado se `emailVerified: false`
  - [ ] Endpoint `/verify-email` funciona
  - [ ] Endpoint `/resend-verification` funciona (rate limit 1/5min)

- [ ] **Recuperação de Senha:**
  - [ ] Endpoint `/forgot-password` envia email
  - [ ] Endpoint `/reset-password` atualiza senha e invalida refresh tokens
  - [ ] Email de confirmação enviado após reset

- [ ] **Bloqueio de Conta:**
  - [ ] Conta bloqueada após 5 tentativas falhas em 15min
  - [ ] Campo `isLocked` setado para `true` ao bloquear
  - [ ] Campo `isLocked` setado para `false` ao desbloquear
  - [ ] Email de notificação enviado
  - [ ] Desbloqueio automático após 30min
  - [ ] Login bloqueado retorna mensagem clara

- [ ] **Multi-tenancy:**
  - [ ] Modelo `Organization` criado
  - [ ] Signup exige `organizationId` (exceto SUPER_ADMIN)
  - [ ] Signup valida senha forte (mín 8 chars, 1 letra, 1 número, 1 especial)
  - [ ] `OrganizationGuard` bloqueia acesso cross-org
  - [ ] SUPER_ADMIN tem acesso global
  - [ ] Seed script cria SUPER_ADMIN e org inicial

- [ ] **Rate Limiting:**
  - [ ] Auth endpoints limitados a 5 req/min
  - [ ] `/resend-verification` limitado a 1 req/5min
  - [ ] 6º request retorna 429

- [ ] **Cleanup Jobs:**
  - [ ] Cron job de refresh tokens funciona
  - [ ] Cron job de login attempts funciona
  - [ ] Logs estruturados registram execução

- [ ] **Testes:**
  - [ ] Coverage >= 90% em módulos críticos
  - [ ] 100% dos testes unitários passando
  - [ ] 100% dos testes E2E passando
  - [ ] Nenhum log com senhas/tokens em plaintext

- [ ] **Documentação:**
  - [ ] Swagger atualizado com todos os endpoints
  - [ ] README atualizado com seção de autenticação
  - [ ] Env vars SMTP documentadas

- [ ] **Qualidade:**
  - [ ] `npm run check` passa sem erros (format + lint + type check)
  - [ ] Nenhum código comentado ou debug log deixado

## 6) Perguntas em aberto / Assunções

### Perguntas:

**Q1:** Como notificar SUPER_ADMIN quando usuário específico é bloqueado repetidamente?
**A (assunção):
** Implementar contador de bloqueios no modelo User. Se bloqueado > 3x em 24h, enviar email para SUPER_ADMIN. Implementar em fase futura se necessário.

**Q2:** Como lidar com usuário que esqueceu email usado no cadastro?
**A (assunção):** Fora de escopo desta versão. Usuário deve contatar suporte.

**Q3:** SUPER_ADMIN pode desbloquear conta manualmente?
**A (assunção):** Sim, via endpoint `PATCH /v1/users/:id/unlock` (protegido com
`RolesGuard(SUPER_ADMIN)`). Implementar no módulo `user`, não no `auth`.

**Q4:** Como lidar com mudança de organização de um usuário?
**A (assunção):** SUPER_ADMIN pode atualizar `organizationId` via
`PATCH /v1/users/:id`. Invalidar todos os refresh tokens ao mudar organização (evitar acesso com token antigo).

**Q5:** Como testar emails em ambiente de desenvolvimento sem SMTP real?
**A (assunção):** Usar Mailtrap (https://mailtrap.io) ou flag
`SKIP_EMAIL=true` que faz EmailService apenas logar sem enviar.

### Assunções confirmadas do PRD:

- SMTP configurável via env vars (Nodemailer)
- Templates HTML simples e responsivos
- Front-end lida com timezone (backend sempre UTC)
- Apenas Anderson Santo será SUPER_ADMIN inicialmente (seed)
- Ilimitados dispositivos, mas limite de 10 refresh tokens ativos/usuário
- Refresh token sempre rotacionado a cada uso
- Refresh token armazenado hasheado (SHA256)
- Se refresh token revogado for usado, invalidar TODOS os tokens do usuário
- Cleanup jobs rodam às 03:00 e 04:00 UTC
- Login attempts removidos após 60 dias
- Rate limit: global 30 req/min, auth 5 req/min, resend 1/5min
