import { LoginDto, SignupDto } from '@auth/application/dtos';
import { AuthServicePort } from '@auth/domain/ports';
import { JwtAuthGuard } from '@auth/infrastructure/adapters/credentials';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';

describe(AuthController.name, () => {
  let app: INestApplication;
  let service: jest.Mocked<AuthServicePort>;

  beforeEach(async () => {
    service = {
      signup: jest.fn(),
      login: jest.fn(),
    } as jest.Mocked<AuthServicePort>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthServicePort, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'user-123', email: 'test@example.com' };
          return true;
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should allow signup', async () => {
    const dto: SignupDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      fullName: 'New User',
    };

    service.signup.mockResolvedValue({ accessToken: 'valid-jwt-token' });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(dto)
      .expect(201)
      .expect({ accessToken: 'valid-jwt-token' });

    expect(service.signup).toHaveBeenCalledWith(dto);
  });

  it('should allow login', async () => {
    const dto: LoginDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
    };

    service.login.mockResolvedValue({ accessToken: 'valid-jwt-token' });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send(dto)
      .expect(200)
      .expect({ accessToken: 'valid-jwt-token' });

    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('should allow access to protected route with valid token', async () => {
    await request(app.getHttpServer())
      .post('/auth/protected')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect({
        message: 'You are authorized!',
        user: { id: 'user-123', email: 'test@example.com' },
      });
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
