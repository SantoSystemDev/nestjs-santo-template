import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { HealthModule } from './health/health.module';
import { auth } from './lib/auth';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRoot({
      auth,
      // O bodyParser do NestJS é desabilitado no main.ts (bodyParser: false) porque o
      // better-auth precisa acessar o corpo bruto das requisições de autenticação.
      // Aqui, o AuthModule re-habilita o parsing apenas para as rotas que NÃO são de auth,
      // garantindo que o restante da aplicação continue funcionando normalmente.
      bodyParser: {
        // Reativa o parsing de JSON para rotas não-auth. O limit define o tamanho máximo
        // do corpo da requisição (padrão do Express é 100kb, aqui aumentado para 2mb).
        json: { limit: '2mb' },
        // Reativa o parsing de formulários (application/x-www-form-urlencoded).
        // extended: true usa a lib 'qs' que permite objetos aninhados no body (ex: user[name]=João).
        urlencoded: { limit: '2mb', extended: true },
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
