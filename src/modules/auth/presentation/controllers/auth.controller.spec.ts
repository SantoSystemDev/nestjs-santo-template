import { SignupDto } from '@auth/application/dtos';
import { AuthService } from '@auth/application/services';
import { JwtPayloadModel } from '@auth/domain/models';
import {
  JwtAuthGuard,
  PasswordAuthGuard,
} from '@auth/infra/adapters/credentials';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleEnum } from '@user/domain/enums/role.enum';
import * as request from 'supertest';
import { AuthController } from './auth.controller';

describe(AuthController.name, () => {
  let app: INestApplication;
  let service: AuthService;

  const userJwtPayload: JwtPayloadModel = {
    userId: 'user-123',
    email: 'test@example.com',
    roles: [RoleEnum.ADMIN],
  };

  beforeAll(async () => {
    const mockAuthService = {
      signup: jest.fn().mockResolvedValue({ accessToken: 'mockAccessToken' }),
      login: jest.fn().mockResolvedValue({ accessToken: 'mockAccessToken' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(PasswordAuthGuard)
      .useValue({
        canActivate: jest.fn((context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = userJwtPayload;
          return true;
        }),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = userJwtPayload;
          return true;
        }),
      })
      .compile();

    app = module.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    service = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('POST /auth/signup', () => {
    it('should return 201 and success message on successful signup', async () => {
      const signupDto: SignupDto = {
        email: 'user@example.com',
        password: 'Password123!',
        fullName: 'John Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body.accessToken).toBe('mockAccessToken');
      expect(service.signup).toHaveBeenCalledWith(signupDto);
    });

    it('should return 400 if email is invalid', async () => {
      const signupDto: SignupDto = {
        email: 'invalid-email',
        password: 'Password123!',
        fullName: 'John Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 if password is too short', async () => {
      const signupDto: SignupDto = {
        email: 'user@example.com',
        password: 'short',
        fullName: 'John Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);

      expect(response.body.message).toContain(
        'password must be longer than or equal to 6 characters',
      );
    });

    it('should return 400 if fullName is empty', async () => {
      const signupDto: SignupDto = {
        email: 'user@example.com',
        password: 'Password123!',
        fullName: '',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);

      expect(response.body.message).toContain('fullName should not be empty');
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 and success message on successful login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'newuser@example.com', password: 'test123' })
        .expect(200);

      expect(response.body.accessToken).toBe('mockAccessToken');
      expect(service.login).toHaveBeenCalledWith(userJwtPayload);
    });
  });

  describe('POST /auth/protected', () => {
    it('should return 200 and message on protected route access', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/protected')
        .set('Authorization', 'Bearer mockJwtToken')
        .expect(200);

      expect(response.body.message).toBe('You are authorized!');
      expect(response.body.user).toEqual(userJwtPayload);
    });

    it('should deny access to protected route with invalid token', async () => {
      const jwtAuthGuard = app.get<JwtAuthGuard>(JwtAuthGuard);
      jest.spyOn(jwtAuthGuard, 'canActivate').mockReturnValue(false);

      await request(app.getHttpServer())
        .post('/auth/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });
  });
});
