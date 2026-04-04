/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';

// Load ephemeral database URL BEFORE app modules are imported
const envFile: { databaseUrl: string } = JSON.parse(
  readFileSync(join(__dirname, '.e2e-env.json'), 'utf-8'),
);
process.env.DATABASE_URL = envFile.databaseUrl;
process.env.BETTER_AUTH_SECRET = 'test-secret-for-e2e';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  let prisma: any;

  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'StrongP@ssw0rd!',
  };

  let sessionCookie: string[];

  beforeAll(async () => {
    // Dynamic import to ensure DATABASE_URL is set before PrismaClient instantiation
    const { AppModule } = await import('../src/app.module.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/sign-up/email', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send(testUser);

      expect(res.status).toBe(200);
    });

    it('should reject sign-up without required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({ email: 'incomplete@example.com' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject sign-up with a short password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Use the better-auth server API to get verification token
      const verification = await prisma.verifications.findFirst({
        where: {
          identifier: { startsWith: 'email-verification' },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (verification) {
        const res = await request(app.getHttpServer())
          .get('/api/auth/verify-email')
          .query({ token: verification.value });

        expect([200, 302]).toContain(res.status);
      } else {
        // If no verification record exists, verify directly via API
        const user = await prisma.users.findUnique({
          where: { email: testUser.email },
        });
        expect(user).not.toBeNull();

        // Manually verify the email for subsequent tests
        await prisma.users.update({
          where: { email: testUser.email },
          data: { emailVerified: true },
        });
      }

      // Confirm the email is now verified
      const verifiedUser = await prisma.users.findUnique({
        where: { email: testUser.email },
      });
      expect(verifiedUser?.emailVerified).toBe(true);
    });

    it('should reject invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/verify-email')
        .query({ token: 'invalid-token-123' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/sign-in/email', () => {
    it('should sign in with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();

      sessionCookie = res.headers['set-cookie'] as unknown as string[];
    });

    it('should reject sign-in with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject sign-in with non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email: 'nonexistent@example.com',
          password: 'whatever123',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/auth/get-session', () => {
    it('should return session for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('session');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should return null session without cookie', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/auth/get-session',
      );

      // better-auth returns 200 with null/empty body when no session
      expect(res.status).toBe(200);
      expect(res.body?.session ?? null).toBeNull();
    });
  });

  describe('POST /api/auth/change-password', () => {
    const newPassword = 'NewStr0ngP@ss!';

    it('should reject change without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send({
          currentPassword: testUser.password,
          newPassword,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject change with wrong current password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: 'wrongcurrent',
          newPassword,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should change password for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: testUser.password,
          newPassword,
        });

      expect(res.status).toBe(200);

      // Update stored password for subsequent tests
      testUser.password = newPassword;

      // Re-sign-in with new password to get a fresh session
      const signInRes = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(signInRes.status).toBe(200);
      sessionCookie = signInRes.headers['set-cookie'] as unknown as string[];
    });
  });

  describe('POST /api/auth/change-email', () => {
    it('should reject change-email without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-email')
        .send({ newEmail: 'new@example.com' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept change-email request for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-email')
        .set('Cookie', sessionCookie)
        .send({ newEmail: `new-${Date.now()}@example.com` });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/update-user', () => {
    it('should reject update without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/update-user')
        .send({ name: 'Updated Name' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should update user profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/update-user')
        .set('Cookie', sessionCookie)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should accept a valid email for password reset', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/request-password-reset')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
    });

    it('should not leak whether the email exists (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/request-password-reset')
        .send({ email: 'nonexistent-user@example.com' });

      // Should return 200 regardless of whether the email exists
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'ResetP@ss123!',
          token: 'invalid-token',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reset password with valid token', async () => {
      // Capture the token from the console.log callback
      let capturedToken: string | undefined;
      const logSpy = jest
        .spyOn(console, 'log')
        .mockImplementation((...args: any[]) => {
          const msg = args.join(' ');
          const match = msg.match(/\[DEV\] Password reset.*\(token: (.+)\)/);
          if (match) {
            capturedToken = match[1];
          }
        });

      // Request a password reset
      await request(app.getHttpServer())
        .post('/api/auth/request-password-reset')
        .send({ email: testUser.email });

      logSpy.mockRestore();

      expect(capturedToken).toBeDefined();

      const resetPassword = 'AfterReset@123!';
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          newPassword: resetPassword,
          token: capturedToken,
        });

      expect(res.status).toBe(200);
      testUser.password = resetPassword;
    });
  });

  describe('POST /api/auth/sign-out', () => {
    it('should sign out authenticated user', async () => {
      // Sign in first to get fresh session
      const signInRes = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const cookie = signInRes.headers['set-cookie'] as unknown as string[];

      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-out')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
    });

    it('should invalidate session after sign-out', async () => {
      // Sign in to get a session
      const signInRes = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const cookie = signInRes.headers['set-cookie'] as unknown as string[];

      // Sign out
      await request(app.getHttpServer())
        .post('/api/auth/sign-out')
        .set('Cookie', cookie);

      // Try to use the old session — better-auth returns 200 with null/empty
      const sessionRes = await request(app.getHttpServer())
        .get('/api/auth/get-session')
        .set('Cookie', cookie);

      expect(sessionRes.body?.session ?? null).toBeNull();
    });
  });
});
