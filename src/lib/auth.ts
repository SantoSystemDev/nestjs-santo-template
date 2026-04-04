import prisma from '@/lib/prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, openAPI, organization } from 'better-auth/plugins';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql', // or "mysql", "postgresql", ...etc
    usePlural: true,
  }),
  trustedOrigins: ['http://localhost:*'],
  emailAndPassword: {
    // Habilita autenticação por email e senha (padrão: false).
    // Sem isso, os endpoints sign-up/email e sign-in/email não ficam disponíveis.
    enabled: true,

    // Exige que o usuário verifique o email antes de conseguir fazer login (padrão: false).
    // Com isso ativo, sign-in retorna 403 se o email não foi verificado.
    // Também protege contra enumeração de emails: o sign-up retorna 200
    // mesmo que o email já exista, impedindo que atacantes descubram contas.
    // requireEmailVerification: true,

    // Invalida todas as sessões ativas quando o usuário reseta a senha (padrão: false).
    // Garante que se a senha foi comprometida, sessões antigas do atacante
    // são encerradas imediatamente.
    revokeSessionsOnPasswordReset: true,

    // Callback chamado quando o usuário solicita reset de senha via POST /request-password-reset.
    // Recebe o objeto do usuário, a URL completa de reset, e o token bruto.
    // IMPORTANTE: Não usar await no envio do email para evitar timing attacks
    // (diferença no tempo de resposta revelaria se o email existe ou não).
    // eslint-disable-next-line @typescript-eslint/require-await
    sendResetPassword: async ({ user, url, token }) => {
      // TODO: Substituir pelo provider de email real (Resend, SES, Nodemailer, etc.)
      console.log(
        `[DEV] Password reset for ${user.email}: ${url} (token: ${token})`,
      );
    },
  },
  emailVerification: {
    // Callback chamado para enviar o email de verificação.
    // Recebe o objeto do usuário, a URL de verificação, e o token bruto.
    // IMPORTANTE: Não usar await no envio para evitar timing attacks.
    // eslint-disable-next-line @typescript-eslint/require-await
    sendVerificationEmail: async ({ user, url, token }) => {
      // TODO: Substituir pelo provider de email real (Resend, SES, Nodemailer, etc.)
      console.log(
        `[DEV] Verification email for ${user.email}: ${url} (token: ${token})`,
      );
    },
    // Envia o email de verificação automaticamente após o sign-up (padrão: false).
    // Sem isso, o email de verificação só seria enviado se chamado manualmente
    // via authClient.sendVerificationEmail().
    sendOnSignUp: true,

    // Reenvia o email de verificação automaticamente a cada tentativa de sign-in
    // quando o email ainda não foi verificado (padrão: false).
    // Só funciona com autenticação email/password e requireEmailVerification ativo.
    // Melhora a UX: o usuário não precisa pedir reenvio manualmente.
    sendOnSignIn: true,

    // Faz login automaticamente após o usuário verificar o email (padrão: false).
    // Melhora a UX: o usuário clica no link de verificação e já entra logado,
    // sem precisar digitar email/senha novamente.
    autoSignInAfterVerification: true,
  },
  user: {
    changeEmail: {
      enabled: true, // Set to false if you don't want to allow users to change their email
    },
  },
  plugins: [admin(), organization(), openAPI()],
});
