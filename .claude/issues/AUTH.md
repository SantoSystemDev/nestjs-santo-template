# Template de Autenticação NestJS

Template básico de autenticação para reutilização em outros projetos. Simples, seguro e performático.

---

## ✅ O Que Já Existe

### Fluxos de Autenticação
| Endpoint | Status | Observação |
|----------|--------|------------|
| `POST /auth/signup` | ✅ | Cria usuário + organização, envia email de verificação |
| `POST /auth/login` | ✅ | Retorna access token no body + refresh token em cookie |
| `POST /auth/logout` | ✅ | Revoga refresh token, limpa cookie |
| `POST /auth/refresh` | ✅ | Rotaciona refresh token (mais seguro) |
| `POST /auth/verify-email` | ✅ | Valida token de verificação |
| `POST /auth/resend-verification` | ✅ | Reenvia email de verificação |
| `POST /auth/forgot-password` | ✅ | Envia email com link de reset |
| `POST /auth/reset-password` | ✅ | Altera senha com token válido |
| `POST /auth/admin/unlock-account/:userId` | ✅ | SUPER_ADMIN desbloqueia conta |

### Segurança Implementada
- ✅ JWT RS256 (assimétrico, mais seguro)
- ✅ Refresh token em httpOnly cookie (sameSite: strict)
- ✅ Refresh token rotativo (invalida anterior a cada uso)
- ✅ Detecção de reuso de token (revoga todos os tokens do usuário)
- ✅ Hash de senha com Argon2 + pepper
- ✅ Bloqueio de conta após 5 tentativas falhas (30min)
- ✅ Rate limiting global (Throttler)
- ✅ Mensagens de erro genéricas (não vazam informação)
- ✅ Tracking de login attempts (IP, user-agent, motivo da falha)
- ✅ Email de notificação de conta bloqueada
- ✅ Email de notificação de senha alterada

### Estrutura de Dados
- ✅ User (email, passwordHash, fullName, isActive, emailVerified, isLocked, lockedUntil, organizationId)
- ✅ UserRole (relação 1:N com User)
- ✅ RefreshToken (jti, tokenHash, ipAddress, userAgent, expiresAt, revokedAt, replacedByJti)
- ✅ LoginAttempts (email, userId, ipAddress, userAgent, success, failureReason, timestamp)
- ✅ Organization (name, slug, isActive)

### Templates de Email
- ✅ Verificação de email (24h expiração)
- ✅ Reset de senha (1h expiração)
- ✅ Conta bloqueada
- ✅ Senha alterada

---

## ❌ O Que Falta Implementar

### 1. Endpoint `GET /auth/me`
Retornar dados do usuário logado.

### 2. Decorator `@Roles()` + `RolesGuard`
Controle de acesso por roles nas rotas.

### 3. `OrganizationGuard` (Tenant Guard)
- SUPER_ADMIN: acessa tudo
- ADMIN/MEMBER: apenas recursos da própria org

### 4. Guard `@RequireEmailVerified()`
Bloquear rotas sensíveis para usuários com email não verificado.
> **Nota:** Login é permitido sem email verificado, mas rotas de negócio são bloqueadas.

### 5. Campo `acceptedTermsAt` (LGPD)
Armazenar data de aceite dos termos no signup.

### 6. Campo `lastPasswordChange`
Para invalidar tokens emitidos antes da troca de senha.

### 7. Rate Limit Específico para Auth
| Endpoint | Limite |
|----------|--------|
| `/login` | 5/min por IP + 5/min por email |
| `/forgot-password` | 3/hora por email |
| `/signup` | 3/min por IP |

### 8. Ajuste no Signup - Criar Organização
Signup público cria usuário como ADMIN da nova organização:
```
POST /auth/signup
{
  "email": "admin@empresa.com",
  "password": "...",
  "fullName": "João Silva",
  "organizationName": "Empresa X"  // Cria org automaticamente
}
```

---

## ⚠️ O Que Precisa Ajustar

### 1. Renomear Role `USER` → `MEMBER`
- Arquivo: `src/modules/user/domain/enums/role.enum.ts`
- Atualizar seed e migrações se necessário

### 2. Reduzir limite de refresh tokens: 10 → 5

### 3. Aumentar TTL access token: 15min → 30min
Reduzir chamadas ao backend.

### 4. Ajustar login - permitir sem email verificado
Atualmente bloqueia. Deve permitir login, mas bloquear rotas sensíveis.

### 5. Invalidar todos tokens em troca de senha
Já existe `revokeAllByUserId` no reset-password. Verificar se usa em change-password também.

---

## 🗑️ Política de Exclusão (Soft Delete)

| Entidade | Pode deletar? | Regra |
|----------|---------------|-------|
| SUPER_ADMIN | ❌ Nunca | Apenas desativar. Se único, nem desativar. |
| Outros usuários | ❌ | Apenas desativar (`isActive: false`) |
| Organizações | ❌ | Apenas desativar |
| RefreshTokens | ✅ | Pode deletar físico (cleanup) |
| LoginAttempts | ✅ | Pode deletar físico (retenção 90 dias?) |

---

## 📋 Hierarquia de Roles

```
├── SUPER_ADMIN (você - criado via seed)
│   └── Acessa TUDO em todas as organizações
│   └── Cria/edita/desativa organizações
│   └── Cria/edita admins de organizações
│   └── Não pode ser deletado nem desativado (se único)
│
└── Organization (criada no signup público)
    ├── ADMIN (quem fez signup)
    │   └── Gerencia usuários da sua org
    │   └── Cria usuários MEMBER/ADMIN na org
    │
    └── MEMBER (criado pelo admin)
        └── Acesso limitado dentro da ORG
        └── Apenas visualização/ações específicas
```

---

## 🔧 Decisões Técnicas

| Item | Decisão |
|------|---------|
| Access Token TTL | 30 minutos |
| Refresh Token TTL | 7 dias |
| Max Refresh Tokens | 5 por usuário |
| Access Token | No body (front guarda em memória) |
| Refresh Token | httpOnly cookie |
| Verificação email | 24h expiração |
| Reset senha | 1h expiração |
| Bloqueio conta | 30min após 5 falhas |
| Exclusão dados | Soft delete (maioria) |
| Login sem email verificado | Permitido, rotas sensíveis bloqueadas |

---

## 📦 Arquivos a Criar/Modificar

```
[MODIFY] src/modules/auth/presentation/controllers/auth.controller.ts
         - Adicionar GET /me
         - Ajustar login para permitir sem email verificado

[MODIFY] src/modules/auth/application/services/auth.service.ts
         - TTL 30min, limite 5 tokens
         - Permitir login sem email verificado

[MODIFY] src/modules/auth/application/dtos/signup.dto.ts
         - Adicionar campo organizationName

[NEW] src/shared/decorators/roles.decorator.ts
      - Decorator @Roles()

[NEW] src/shared/guards/roles.guard.ts
      - RolesGuard

[NEW] src/shared/guards/organization.guard.ts
      - OrganizationGuard (tenant isolation)

[NEW] src/shared/guards/email-verified.guard.ts
      - Guard @RequireEmailVerified()

[MODIFY] src/modules/user/domain/enums/role.enum.ts
         - Renomear USER → MEMBER

[MODIFY] src/modules/user/application/services/delete-user.service.ts
         - Soft delete, bloquear SUPER_ADMIN

[NEW] flyway/migrations/V*__add_accepted_terms_and_last_password_change.sql
      - Campos acceptedTermsAt, lastPasswordChange
```

---

## 🧪 Verificação

### Testes Unitários
- [ ] Rodar `make test` após mudanças
- [ ] Garantir que testes existentes passam
- [ ] Adicionar testes para RolesGuard
- [ ] Adicionar testes para OrganizationGuard

### Testes Manuais (via Swagger `/api`)
1. **Signup**: criar usuário, verificar email de verificação
2. **Login**: verificar email não verificado bloqueia, login OK retorna tokens
3. **Refresh**: verificar rotação funciona, reuso detectado revoga tudo
4. **Roles**: MEMBER não acessa rotas de ADMIN, ADMIN não acessa rotas de SUPER_ADMIN
5. **Tenant**: ADMIN da org A não acessa dados da org B

---

## ❓ Perguntas Anteriores (Respondidas)

| Pergunta | Resposta |
|----------|----------|
| Token Version | Não por enquanto. Usar revokeAllByUserId. |
| Rate limit auth | Sim, específico por endpoint |
| HaveIBeenPwned | Não por enquanto |
| Access token TTL | 30min |
| Tokens em cookies | Access no body, refresh em cookie |
| lastPasswordChange | Sim, para invalidar tokens antigos |
| Modelo signup | Público cria org+ADMIN. ADMIN cria na org. |
| Login sem email | Permitido, rotas sensíveis bloqueadas |
| Soft delete | Sim para usuários e orgs |
