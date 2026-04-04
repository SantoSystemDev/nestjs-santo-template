# Como usar autenticação com better-auth

---

## Configuração do projeto

A instância do better-auth fica em `src/lib/auth.ts`. Plugins ativos: **admin** (roles de sistema) e **organization** (multi-tenancy).

O `AuthModule` deve ser registrado no `AppModule` com `bodyParser: false` no bootstrap:

```typescript
// main.ts
const app = await NestFactory.create(AppModule, { bodyParser: false });
```

```typescript
// app.module.ts
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';

@Module({
  imports: [AuthModule.forRoot({ auth }), HealthModule],
})
export class AppModule {}
```

> O `AuthModule` registra um `AuthGuard` globalmente — todas as rotas ficam protegidas por padrão.

---

## 1. Rotas públicas e opcionais

```typescript
import {
  AllowAnonymous,
  OptionalAuth,
  Session,
  UserSession,
} from '@thallesp/nestjs-better-auth';

@Controller('products')
export class ProductController {
  @Get()
  @AllowAnonymous() // sem autenticação
  findAll() {}

  @Get('recommendations')
  @OptionalAuth() // autenticado ou não
  findRecommendations(@Session() session: UserSession) {
    const userId = session?.user?.id; // pode ser undefined
  }
}

// Controller inteiro público
@AllowAnonymous()
@Controller('public')
export class PublicController {}
```

---

## 2. Acessar a sessão em controllers protegidos

```typescript
import { Session, UserSession } from '@thallesp/nestjs-better-auth';

@Controller('users')
export class UserController {
  @Get('me')
  getProfile(@Session() session: UserSession) {
    return {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
  }
}
```

---

## 3. Controle de acesso por role

### Roles de sistema — plugin `admin`

Usa o campo `user.role`. Um admin de organização **não** herda esse acesso.

```typescript
import { Roles } from '@thallesp/nestjs-better-auth';

@Roles(['admin']) // classe inteira
@Controller('admin')
export class AdminController {
  @Get('users')
  listAllUsers() {}

  @Roles(['admin', 'moderator']) // sobrescreve por rota
  @Get('reports')
  listReports() {}
}
```

### Roles de organização — plugin `organization`

Requer `activeOrganizationId` na sessão (o client define via header ou parâmetro).

```typescript
import { OrgRoles, Session, UserSession } from '@thallesp/nestjs-better-auth';

@Controller('org/settings')
export class OrgSettingsController {
  @OrgRoles(['owner', 'admin'])
  @Get()
  getSettings(@Session() session: UserSession) {
    return { orgId: session.session.activeOrganizationId };
  }

  @OrgRoles(['owner'])
  @Delete()
  deleteOrganization() {}
}
```

> Roles padrão do plugin `organization`: `owner`, `admin`, `member`.

---

## 4. Chamar a API do better-auth nos services

Use `AuthService` para acessar os endpoints da API do better-auth (ex: listar contas, banir usuário, etc.):

```typescript
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth';

@Controller('users')
export class UserController {
  constructor(private readonly authService: AuthService<typeof auth>) {}

  @Get('accounts')
  async getAccounts(@Req() req: Request) {
    return this.authService.api.listUserAccounts({
      headers: fromNodeHeaders(req.headers),
    });
  }

  // Exemplo com plugin admin
  @Roles(['admin'])
  @Post(':id/ban')
  async banUser(@Req() req: Request, @Body() body: { reason: string }) {
    return this.authService.api.banUser({
      ...body,
      headers: fromNodeHeaders(req.headers),
    });
  }
}
```

---

## 5. Adicionar um novo plugin

1. Instale o plugin (se necessário) e adicione em `src/lib/auth.ts`:

```typescript
import { twoFactor } from 'better-auth/plugins';

export const auth = betterAuth({
  // ...
  plugins: [
    admin(),
    organization(),
    twoFactor(), // novo plugin
  ],
});
```

2. Rode o CLI do better-auth para atualizar o `schema.prisma` com as novas tabelas do plugin:

```bash
npx auth@latest generate
```

> O CLI lê a instância em `src/lib/auth.ts` e adiciona/atualiza os models necessários no `schema.prisma` automaticamente.

3. Aplique as mudanças no banco e regenere o Prisma Client:

```bash
npx prisma migrate dev --name add-<plugin_or_domain>-tables
npx prisma generate
```

---

## Referência rápida de decoradores

| Decorator              | Onde usar        | Efeito                                         |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `@AllowAnonymous()`    | classe ou método | Rota pública, sem autenticação                 |
| `@OptionalAuth()`      | classe ou método | Sessão injetada se existir, `undefined` se não |
| `@Session()`           | parâmetro        | Injeta a `UserSession` no parâmetro            |
| `@Roles(['admin'])`    | classe ou método | Exige `user.role` específico (plugin admin)    |
| `@OrgRoles(['owner'])` | classe ou método | Exige role de membro na org ativa              |

### Referências da DOC oficial do better-auth

| Recurso                                        | Link                                                       |
| ---------------------------------------------- | ---------------------------------------------------------- |
| better-auth — Email & Password                 | https://better-auth.com/docs/authentication/email-password |
| better-auth — Email Verification               | https://better-auth.com/docs/concepts/email                |
| better-auth — Session Management               | https://better-auth.com/docs/concepts/session-management   |
| better-auth — Database                         | https://better-auth.com/docs/concepts/database             |
| better-auth — Prisma Adapter                   | https://better-auth.com/docs/adapters/prisma               |
| better-auth — Security                         | https://better-auth.com/docs/reference/security            |
| better-auth — NestJS Integration               | https://better-auth.com/docs/integrations/nestjs           |
| Repositório de referência (nestjs-better-auth) | https://github.com/ThallesP/nestjs-better-auth             |
