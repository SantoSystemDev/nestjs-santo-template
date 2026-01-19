- Preciso fazer a parte de autenticação para o meu aplicativo web.
- Você pode me ajudar a entender como implementar a autenticação de usuários usando JWT (JSON Web Tokens) em uma aplicação Node.js com Nest.js;
- Precisa implementar autenticação usando JWT em uma aplicação Node.js com Nest.js.
- Preferecia por usar padroes, sugestoes e boas praticas da documentacao oficial do Nest.js.
- Garantir que a implementacao siga as melhores praticas de seguranca.
- Garantir que vai ser escalavel e de facil manutencao.
- Garantir que a implementacao seja bem documentada.
- Implementar testes unitarios abrangentes para todas as funcionalidades de autenticacao.
- Garantir que a implementacao seja simples para o front-end consumir.
- Implementar Swagger para documentacao automatica da API.
- Gerenciar roles e permissoes de usuarios. Por enquanto, apenas roles basicas como 'SUPER_ADMIN' e 'USER'.
  - 'SUPER_ADMIN' tem acesso total a todas as rotas de todas as organizacoes.
  - 'SUPER_ADMIN' pode criar, editar e deletar outros usuarios e organizações.
  - Apenas eu vou ser 'SUPER_ADMIN' inicialmente.
  - 'USER' tem acesso limitado a rotas especificas da sua organizacao.
  - Qualquer outro usuario cadastrado sera 'USER' por padrao.
- Implementar multi-tenancy (cada usuario pertence a uma organizacao).
  - Apenas 'SUPER_ADMIN' pode gerenciar organizacoes.
  - 'USER' so pode acessar dados da propria organizacao.
- Implementar autenticação baseada em JWT.
- Implementar autorizacao baseada em roles.
- Implementar middleware ou guards para proteger rotas com base nas roles dos usuarios.
- Implementar fluxo de login e registro de usuarios.
- Armazenar senhas de forma segura usando hashing (argon2 - veja exemplo nest).
- Implementar expiracao de tokens JWT para seguranca adicional.
- Implementar refresh tokens para melhorar a seguranca e a experiencia do usuario.
- Implementar bloqueio de conta apos varias tentativas falhas de login.
- Implementar validacao de email apos o cadastro do usuario.
- Implementar recuperacao de senha via email.
- Implementar logout seguro, invalidando tokens quando necessario.
- Implementar monitoramento e logging de tentativas de login e atividades suspeitas.
- Implementar protecao contra ataques comuns, como brute force e CSRF.
- Implementar rate limiting para endpoints de autenticacao.
- Garantir que todas as mensagens de erro sejam genericas para nao vazar informacoes sensiveis.
- Remover dependencias desnecessarias ou não utilizadas para manter o projeto leve.
- Garantir a LGPD e conformidade com a GDPR, se aplicavel.
- Evitar vazamento de dados entre organizacoes.

### Perguntas:

1. **Q**: Qual serviço de email usar (SendGrid, AWS SES, SMTP local)?

- Pode assumir SMTP configurável via env vars, implementação agnóstica (nodemailer)

2. **Q**: 2FA deve ser obrigatório para SUPER_ADMIN?

- Por enquanto não vamos implementar nessa versão. Não se faz necessário agora.

3. **Q**: Quantos dispositivos simultâneos são permitidos?

- Ilimitado, mas com limite de 10 refresh tokens ativos por usuário (cleanup automático dos mais antigos)

4. **Q**: Template de emails deve ser customizável?

- Usar templates HTML simples e responsivos, sem customização inicial

5. **Q**: Bloqueio de conta deve notificar usuário por email?

- Sim, enviar email informando bloqueio e como desbloquear (aguardar 30min ou contatar suporte)

6. **Q**: Refresh token deve ser rotacionado mesmo se não expirou?

- Sim, sempre rotacionar a cada uso para máxima segurança (invalidar anterior)

7. **Q**: Backup codes do 2FA devem ser armazenados hasheados?

- Por enquanto não vamos implementar 2FA nessa versão. Não se faz necessário agora.

8. **Q**: Como lidar com timezone em logs e tokens?

- Usar UTC em todos os timestamps, front-end faz conversão para timezone local
