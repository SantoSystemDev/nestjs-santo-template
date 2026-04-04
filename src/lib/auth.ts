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
    enabled: true,
    requireEmailVerification: true, // Set to false if you don't want to require email verification
    revokeSessionsOnPasswordReset: true, // Set to false if you don't want to revoke sessions on password reset
    // eslint-disable-next-line @typescript-eslint/require-await
    sendResetPassword: async ({ user, url, token }) => {
      // TODO: Replace with a real email provider (Resend, SES, Nodemailer, etc.)
      console.log(
        `[DEV] Password reset for ${user.email}: ${url} (token: ${token})`,
      );
    },
  },
  emailVerification: {
    // eslint-disable-next-line @typescript-eslint/require-await
    sendVerificationEmail: async ({ user, url, token }) => {
      // TODO: Replace with a real email provider (Resend, SES, Nodemailer, etc.)
      console.log(
        `[DEV] Verification email for ${user.email}: ${url} (token: ${token})`,
      );
    },
    sendOnSignUp: true, // Set to false if you don't want to send verification email on sign up
    autoSignInAfterVerification: true, // Set to false if you don't want to automatically sign in users after they verify their email
  },
  user: {
    changeEmail: {
      enabled: true, // Set to false if you don't want to allow users to change their email
    },
  },
  plugins: [admin(), organization(), openAPI()],
});
