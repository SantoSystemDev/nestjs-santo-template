import { z } from 'zod';

export const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().optional(),

  // Database (app)
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_ALG: z.enum(['RS256', 'ES256']).default('RS256'),
  JWT_ISS: z.string(),
  JWT_AUD: z.string(),
  JWT_ACCESS_TTL: z.coerce.number().int().min(60).max(3600),
  JWT_REFRESH_TTL: z.coerce
    .number()
    .int()
    .min(86400) // 1 day
    .max(60 * 24 * 60 * 60),
  JWT_PRIVATE_KEY_BASE64: z.string().min(1),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  JWT_SECRET: z.string().min(1),

  // Security/CORS
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_TTL: z.coerce.number().int().optional(),
  RATE_LIMIT_LIMIT: z.coerce.number().int().optional(),

  // Password hashing
  PASSWORD_PEPPER: z.string().min(16),
});

export function envValidation(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    // Short, safe error
    throw new Error('Invalid environment variables.');
  }
  return parsed.data;
}
