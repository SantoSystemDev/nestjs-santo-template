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
  },
  user: {
    changeEmail: {
      enabled: true, // Set to false if you don't want to allow users to change their email
    },
  },
  plugins: [admin(), organization(), openAPI()],
});
