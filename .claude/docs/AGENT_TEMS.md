# Agent Teams — Equipes de Agentes no Claude Code

> Resumo completo da [documentação oficial](https://code.claude.com/docs/pt/agent-teams).
> Recurso experimental — requer Claude Code v2.1.32+.

---

## O que são Agent Teams?

Coordenam múltiplas instâncias do Claude Code trabalhando juntas. Uma sessão é o **líder**, as demais são **teammates**. Cada teammate tem sua própria context window e podem se comunicar diretamente entre si — diferente de subagents, que só reportam ao agente principal.

---

## Ativar

```json
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Agent Teams vs Subagents vs Sessão Única

| Situação                                           | Melhor escolha   |
| -------------------------------------------------- | ---------------- |
| Teammates precisam se comunicar e coordenar        | **Agent Teams**  |
| Revisão de código com múltiplas perspectivas       | **Agent Teams**  |
| Debug com hipóteses concorrentes                   | **Agent Teams**  |
| Feature abrangendo múltiplas camadas independentes | **Agent Teams**  |
| Trabalho paralelo onde só o resultado importa      | **Subagents**    |
| Tarefas sequenciais ou com dependências            | **Sessão única** |
| Edições no mesmo arquivo                           | **Sessão única** |

**Regra:** Use Agent Teams quando os teammates precisam compartilhar descobertas e desafiar uns aos outros. Subagents quando só o resultado final interessa.

### Diferenças técnicas

|                 | Subagents                              | Agent Teams                                  |
| --------------- | -------------------------------------- | -------------------------------------------- |
| Context         | Própria; resultado retorna ao chamador | Própria; totalmente independente             |
| Comunicação     | Só reportam ao agente principal        | Teammates se mensageiam diretamente          |
| Coordenação     | Agente principal gerencia tudo         | Task list compartilhada com auto-coordenação |
| Custo de tokens | Menor                                  | Maior (cada teammate = instância separada)   |

---

## Arquitetura

```
Team Lead  ←── você interage aqui
    ├── Shared Task List  (tarefas com status: pending / in progress / done)
    ├── Mailbox           (mensagens entre agentes)
    ├── Teammate A        (context window independente)
    ├── Teammate B        (context window independente)
    └── Teammate C        (context window independente)
```

- Config da equipe: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`
- Teammates descobrem outros membros lendo o `config.json` da equipe

---

## Como Iniciar uma Equipe

Descreva a tarefa e a estrutura em linguagem natural. Claude cria a equipe automaticamente:

```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

---

## Modos de Exibição

| Modo                  | Como funciona                                                        | Requisito      |
| --------------------- | -------------------------------------------------------------------- | -------------- |
| `in-process` (padrão) | Todos no terminal principal. Shift+Down para navegar entre teammates | Nenhum         |
| `tmux` / split panes  | Cada teammate em painel separado, visíveis ao mesmo tempo            | tmux ou iTerm2 |

Configure em `settings.json`:

```json
{ "teammateMode": "in-process" }
```

Ou por sessão:

```bash
claude --teammate-mode in-process
```

> Split panes **não funciona** no terminal integrado do VS Code nem Windows Terminal.

---

## Controle da Equipe

### Navegar entre teammates (modo in-process)

- **Shift+Down** — percorre os teammates
- **Enter** — visualiza a sessão do teammate
- **Escape** — interrompe o turno atual do teammate
- **Ctrl+T** — alterna a task list

### Especificar modelo

```text
Create a team with 4 teammates. Use Sonnet for each teammate.
```

### Exigir aprovação de plano antes de implementar

```text
Spawn a teammate to refactor the auth module.
Require plan approval before they make any changes.
```

O líder revisa e aprova/rejeita o plano de cada teammate. Você pode influenciar os critérios:

```text
Only approve plans that include test coverage.
Reject plans that modify the database schema.
```

### Atribuição de tarefas

- **Líder atribui**: diga ao líder qual tarefa dar a qual teammate
- **Auto-reivindicar**: após terminar, o teammate pega a próxima tarefa disponível automaticamente

Tarefas com dependências só podem ser reivindicadas quando as dependências forem concluídas.

### Aguardar teammates

```text
Wait for your teammates to complete their tasks before proceeding.
```

### Encerrar um teammate

```text
Ask the [role] teammate to shut down.
```

### Limpar a equipe (sempre pelo líder)

```text
Clean up the team.
```

> **Nunca peça a um teammate para fazer a limpeza** — pode deixar recursos em estado inconsistente.

---

## Hooks para Gates de Qualidade

```json
// settings.json
{
  "hooks": {
    "TeammateIdle": [...],   // executado quando teammate vai ficar ocioso — sair com código 2 envia feedback e mantém trabalhando
    "TaskCompleted": [...]   // executado quando tarefa é marcada como concluída — sair com código 2 bloqueia a conclusão
  }
}
```

---

## Melhores Práticas

| Prática                          | Detalhe                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| **3-5 teammates**                | Equilíbrio entre paralelismo e overhead de coordenação               |
| **5-6 tasks por teammate**       | Mantém todos produtivos sem alternância excessiva de contexto        |
| **Sem arquivos compartilhados**  | Dois teammates editando o mesmo arquivo causa sobrescrita            |
| **Contexto explícito no prompt** | O histórico de conversa do líder NÃO é transferido para os teammates |
| **Comece com revisão/pesquisa**  | Mais simples que implementação paralela para aprender o recurso      |
| **Monitore e direcione**         | Não deixe a equipe rodar sem supervisão por muito tempo              |
| **CLAUDE.md funciona**           | Todos os teammates leem o `CLAUDE.md` do projeto automaticamente     |

---

## Subagents Especialistas da Stack

> Ficam em `.claude/agents/`. São invocados **em sessões normais** (não dentro de Agent Teams).
> O Claude os aciona automaticamente quando a tarefa bate com o `description` do agente.

| Agente                   | Quando o Claude invoca                                                    | Cor     |
| ------------------------ | ------------------------------------------------------------------------- | ------- |
| `nestjs-architect`       | Criar módulo, controller, service, guard, decorator, configurar bootstrap | Azul    |
| `prisma-specialist`      | Escrever query, ajustar schema, entender relacionamentos                  | Ciano   |
| `better-auth-specialist` | Auth, sessões, `@OrgRoles`, `@Session()`, configurar better-auth          | Magenta |
| `nestjs-tester`          | Escrever ou corrigir testes unitários e e2e                               | Verde   |

> **Por que não usá-los dentro de Agent Teams?**
> Teammates já são sessões Claude Code completas. Invocar um subagent dentro de um teammate adiciona custo de tokens sem ganho real. O expertise vai **direto no prompt do teammate** — é o padrão da doc oficial.

---

## Times de Agentes para Este Projeto

> Copie o prompt, cole no chat e o Claude monta o time automaticamente.
> O expertise da stack está embutido diretamente no role de cada teammate.

---

### Time 1 — Integrar o Better-Auth ao NestJS

**Quando usar:** Executar o plano `.claude/plans/BETTER_AUTH_SETUP.md`.

```text
Leia o plano em .claude/plans/BETTER_AUTH_SETUP.md completamente antes de criar o time.

Crie um time de 3 teammates para executar o plano em paralelo.
Nenhum teammate edita o mesmo arquivo que outro — confirme isso antes de começar.
Cada teammate exige aprovação de plano antes de qualquer alteração.

Teammate 1 — Especialista em Auth e Módulos NestJS:
Você é especialista em NestJS 11, better-auth 1.5 e @thallesp/nestjs-better-auth.
Regras que você conhece: bodyParser: false é obrigatório no main.ts para o handler HTTP
do better-auth funcionar. PrismaModule deve ser importado antes do AuthModule no AppModule.
auth.ts deve usar new PrismaClient({ adapter }) diretamente — nunca PrismaService fora do DI.
Sempre leia os arquivos antes de modificar. Use Context7 se tiver dúvida sobre a API.
Arquivos sob sua responsabilidade:
- src/lib/auth.ts — trocar para usar PrismaClient com PrismaPg direto
- src/prisma/prisma.module.ts — criar como @Global() com exports: [PrismaService]
- src/app.module.ts — imports: [PrismaModule, AuthModule.forRoot({ auth }), HealthModule]
- src/main.ts — adicionar bodyParser: false no NestFactory.create

Teammate 2 — Especialista em Health Check NestJS:
Você é especialista em NestJS 11 e @nestjs/terminus 11.
Regras que você conhece: HealthIndicator é estendido para criar indicadores customizados.
@AllowAnonymous() importado de @thallesp/nestjs-better-auth torna a rota pública.
Sempre leia os arquivos antes de modificar. Use Context7 se tiver dúvida sobre @nestjs/terminus.
Arquivos sob sua responsabilidade:
- src/health/prisma.health.ts — criar PrismaHealthIndicator estendendo HealthIndicator,
  usando prisma.$queryRaw`SELECT 1` e lançando HealthCheckError em caso de falha
- src/health/health.module.ts — registrar PrismaHealthIndicator nos providers
- src/health/health.controller.ts — adicionar @AllowAnonymous() na classe,
  injetar PrismaHealthIndicator e incluir o check de banco no array do health.check()

Teammate 3 — Engenheiro de Testes NestJS:
Você é especialista em @nestjs/testing 11 e Jest 30.
Regras que você conhece: sempre mocke todas as dependências injetadas, nunca só as usadas no teste.
Para controllers com @Session(), use objeto fake: { session: { userId, activeOrganizationId }, user: { id, ... } }.
Aguarde os Teammates 1 e 2 terminarem antes de escrever os testes.
Arquivos sob sua responsabilidade:
- src/health/prisma.health.spec.ts — cenários: isHealthy retorna status ok; falha lança HealthCheckError
- src/health/health.controller.spec.ts — adicionar mock de PrismaHealthIndicator e testes
  para check de banco nos cenários saudável e com falha

Ao final, verifique o checklist do plano e rode: npm run test
```

---

### Time 2 — Implementar o CRUD de Usuários

**Quando usar:** Executar o plano `.claude/plans/3_USER_CRUD.md`.

```text
Leia o plano em .claude/plans/3_USER_CRUD.md completamente antes de criar o time.
Confirme que PrismaModule e AuthModule.forRoot estão presentes no AppModule antes de começar.

Crie um time de 3 teammates para executar o plano em paralelo.
Nenhum teammate edita o mesmo arquivo que outro — confirme isso antes de começar.
Cada teammate exige aprovação de plano antes de qualquer alteração.

Teammate 1 — Desenvolvedor de Controller e DTOs:
Você é especialista em NestJS 11, class-validator, class-transformer e @nestjs/swagger.
Regras que você conhece: DTOs de response nunca expõem campos sensíveis (role, banned, tokens).
Todo endpoint precisa de @ApiOperation, @ApiOkResponse e demais decorators Swagger completos.
Path alias @/ mapeia para src/ — use em todos os imports internos.
Sempre leia os arquivos existentes antes de criar novos. Use Context7 se tiver dúvida.
Arquivos sob sua responsabilidade:
- src/users/dtos/update-user.dto.ts — name? (IsString, MaxLength 100) e image? (IsUrl)
- src/users/dtos/user-response.dto.ts — id, name, email, emailVerified, image?, role?, createdAt
- src/users/users.controller.ts — 6 endpoints do plano com decorators Swagger e @Session()
- src/users/users.module.ts — registrar controller e service
- src/app.module.ts — adicionar UsersModule aos imports

Teammate 2 — Desenvolvedor de Service e Autorização:
Você é especialista em NestJS 11, Prisma 7 com @prisma/adapter-pg, e better-auth 1.5.
Regras críticas que você conhece:
- prisma.users e prisma.members (plural) — nunca prisma.user (o schema usa usePlural: true)
- findUnique/findFirst podem retornar null — sempre verifique antes de usar o resultado
- @OrgRoles bloqueia usuários comuns — autorização mista (self OU org admin) vai no service via Prisma
- session.session.activeOrganizationId pode ser null — verifique antes de usar em queries
- auth.api.adminUpdateUser() usa role global, não org — use Prisma diretamente para updates org-scoped
Sempre leia o plano e os arquivos existentes antes de implementar. Use Context7 se tiver dúvida.
Arquivos sob sua responsabilidade:
- src/users/users.service.ts — getMe, updateMe, listOrgUsers, getUserById, updateUserById,
  deleteUserById e o helper privado assertCanManageUser seguindo o fluxo do plano

Teammate 3 — Engenheiro de Testes:
Você é especialista em @nestjs/testing 11 e Jest 30.
Regras que você conhece: mocke todas as dependências injetadas do componente testado.
Para @Session(), use objeto fake: { session: { userId: 'u1', activeOrganizationId: 'org1' }, user: { id: 'u1', ... } }.
Cubra sempre: happy path, ForbiddenException, NotFoundException, e edge cases do plano.
Aguarde os Teammates 1 e 2 terminarem antes de escrever os testes.
Arquivos sob sua responsabilidade:
- src/users/users.controller.spec.ts — mocks de UsersService, testes por endpoint
- src/users/users.service.spec.ts — mocks de PrismaService, todos os cenários:
  happy path, ForbiddenException (sem org, sem permissão), NotFoundException, self-delete bloqueado

Ao final, verifique o checklist do plano e rode: npm run test
```

---

### Time 3 — Revisão de Código com Três Perspectivas

**Quando usar:** Antes de fazer merge de qualquer módulo novo ou ao auditar código existente.

```text
Leia todos os arquivos em src/[MODULO]/ antes de iniciar.

Crie um time de 3 revisores — cada um lê os mesmos arquivos mas foca em aspectos diferentes.
Ao final, cada revisor reporta ao líder e juntos consolidam um relatório único.

Reviewer 1 — Revisor de Segurança e Auth:
Você é especialista em segurança de APIs NestJS com better-auth e @thallesp/nestjs-better-auth.
Conhece os padrões: guard global (deny by default), @AllowAnonymous(), @OrgRoles(), @Session().
Para cada endpoint, analise: tem o decorator de auth correto? Há risco de IDOR?
O DTO de response expõe campos sensíveis (role, banned, tokens, hashedPassword)?
O input recebido via @Body() é validado com class-validator?
A lógica de autorização mista (self OU org admin) está no service, não em decorators?

Reviewer 2 — Revisor de Arquitetura NestJS:
Você é especialista em NestJS 11 e boas práticas de arquitetura backend.
Verifique: estrutura do módulo (module/controller/service/dtos está correta?),
separação de responsabilidades (controller só faz HTTP binding, lógica está no service?),
uso correto de injeção de dependência, decorators Swagger completos em todos os endpoints,
e conformidade com o padrão do projeto (use src/health/ como referência).

Reviewer 3 — Revisor de Qualidade de Testes:
Você é especialista em @nestjs/testing 11 e Jest 30.
Mapeie o que está coberto vs o que está faltando nos specs.
Verifique qualidade dos mocks (todas as dependências injetadas estão mockadas?).
Identifique: faltam testes para erros de autorização? Para NotFoundException? Para edge cases?
Há testes e2e onde deveriam existir?

Consolide em relatório com 3 seções:
BLOQUEIO (corrigir antes do merge) | MELHORIA (deve corrigir) | SUGESTÃO (opcional)
```

---

### Time 4 — Debug com Hipóteses Concorrentes

**Quando usar:** Causa raiz de um bug é incerta, múltiplas possibilidades para investigar.

```text
Problema relatado: [DESCRIÇÃO EXATA DO PROBLEMA E COMO REPRODUZIR].

Crie um time de 3 investigadores — cada um testa uma hipótese diferente
e deve ativamente tentar desprovar as teorias dos outros.

Investigator 1 — Especialista em Auth e Configuração:
Você é especialista em better-auth 1.5, @thallesp/nestjs-better-auth e configuração NestJS.
Você sabe que: bodyParser: false é obrigatório; PrismaModule deve vir antes do AuthModule;
session.session.activeOrganizationId pode ser null; BETTER_AUTH_SECRET deve ter 32+ chars.
Investigue: src/lib/auth.ts (configuração de sessão, plugins, trustedOrigins),
src/app.module.ts (ordem dos imports), src/main.ts (bodyParser: false presente?),
variáveis de ambiente (BETTER_AUTH_SECRET, BETTER_AUTH_URL).

Investigator 2 — Especialista em Banco e Prisma:
Você é especialista em Prisma 7 com @prisma/adapter-pg e PostgreSQL.
Você sabe que: os models usam usePlural: true; findUnique/findFirst podem retornar null;
o cliente gerado fica em src/generated/prisma/ e nunca deve ser editado manualmente.
Investigue: prisma/schema.prisma (models de sessions, users, members e seus campos),
src/prisma/prisma.service.ts (configuração do adapter, onModuleInit, onModuleDestroy),
e queries suspeitas que possam ter null não tratado ou nome de model errado (singular vs plural).

Investigator 3 — Especialista em Runtime NestJS:
Você é especialista em NestJS 11 e Express middleware chain.
Você sabe que: a ordem dos imports no AppModule importa; circular dependency causa falha silenciosa;
guards globais são registrados pelo AuthModule e se aplicam a todas as rotas sem @AllowAnonymous().
Rastreie o fluxo completo de uma requisição: bootstrap em src/main.ts,
guard global, middleware chain do Express, e verifique se há módulo fora de ordem ou import faltando.

Os três se comunicam ativamente e tentam desprovar as hipóteses uns dos outros.
Ao final, documentem: causa raiz identificada, evidências e solução recomendada.
```

---

### Time 5 — Design de Nova Feature

**Quando usar:** Antes de implementar qualquer módulo novo. Resultado: arquivo em `.claude/plans/`.

```text
Crie um time de design para planejar a feature: [DESCRIÇÃO DA FEATURE].
Nenhum código deve ser escrito — apenas o plano de implementação.
Caso o plano envolva múltiplos arquivos ou camadas, divida em tarefas claras e independentes.

Crie um time de 3 especialistas que colaboram para produzir um plano completo.

Specialist 1 — Designer de API e Dados:
Você é especialista em NestJS 11+, Prisma 7+ e design de APIs RESTful.
Use src/users/ e src/health/ como referência de padrão do projeto.
Defina: endpoints (method + path + quem pode acessar), DTOs de request/response com regras de class-validator, queries Prisma necessárias (models e relacionamentos via prisma.schema), e estrutura completa de arquivos do módulo (module,controllers,services,dtos,specs).

Specialist 2 — Especialista em Segurança e Autorização:
Você é especialista em better-auth 1.5+ e @thallesp/nestjs-better-auth.
Para cada endpoint proposto pelo Specialist 1, defina: qual decorator de auth usar
(@AllowAnonymous, @OrgRoles, ou guard implícito), se há risco de IDOR e como prevenir, quais campos não devem aparecer no DTO de response, e edge cases de autorização (null activeOrganizationId, self-access vs org-access, role global vs role de org).

Specialist 3 — Arquiteto de Testes:
Você é especialista em @nestjs/testing 11+, Jest 30+ e supertest 7+.
Para cada endpoint definido, liste os casos de teste: happy path, erros de validação, erros de autorização (ForbiddenException), não encontrado (NotFoundException), edge cases.
Defina a estratégia de mock para controller.spec (mock de service) e service.spec (ex: mock de PrismaService).

- Ao final, o líder consolida tudo em um plano com seções claras para cada especialista e salva em .claude/plans/[NOME_DA_FEATURE].md, criando no final do arquivo um checklist de implementação ordenado.
```

---

## Limitações Conhecidas

| Limitação                      | Detalhe                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `/resume` e `/rewind`          | Não restauram teammates in-process                                         |
| Status de tasks atrasado       | Teammates às vezes não marcam tasks como concluídas — atualize manualmente |
| Uma equipe por líder           | Limpe antes de iniciar nova equipe                                         |
| Sem equipes aninhadas          | Teammates não podem gerar suas próprias equipes                            |
| Líder é fixo                   | Não é possível promover teammate a líder                                   |
| Permissões no tempo de geração | Todos os teammates herdam as permissões do líder                           |
| Split panes limitado           | Não funciona no VS Code, Windows Terminal ou Ghostty                       |
| Encerramento lento             | Teammate termina a chamada atual antes de sair                             |

---

## Troubleshooting

| Problema                         | Solução                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Teammates não aparecem           | Shift+Down para verificar se já existem. Checar se tmux está instalado (`which tmux`) |
| Muitos prompts de permissão      | Pré-aprovar operações comuns em `settings.json` antes de criar a equipe               |
| Teammate parou num erro          | Navegar até ele (Shift+Down), dar instruções diretas ou gerar um substituto           |
| Líder encerrou antes de terminar | Dizer ao líder para continuar ou aguardar teammates                                   |
| Sessão tmux órfã                 | `tmux ls` e `tmux kill-session -t <session-name>`                                     |
