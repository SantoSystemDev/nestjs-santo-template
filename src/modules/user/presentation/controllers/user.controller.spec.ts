import { JwtAuthGuard } from '@auth/infrastructure/adapters/credentials';
import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto, UserResponseDto } from '@user/application/dtos';
import { RoleEnum } from '@user/domain/enums/role.enum';
import {
  CreateUserServicePort,
  DeleteUserServicePort,
  UpdateUserServicePort,
} from '@user/domain/ports';
import { UserController } from '@user/presentation/controllers';
import * as request from 'supertest';

describe(UserController.name, () => {
  let app: INestApplication;

  const mockServices = {
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CreateUserServicePort, useValue: mockServices },
        { provide: UpdateUserServicePort, useValue: mockServices },
        { provide: DeleteUserServicePort, useValue: mockServices },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('/POST users', () => {
    const validDto: CreateUserDto = {
      email: 'user@example.com',
      password: 'Password123!',
      fullName: 'John Doe',
      roles: [RoleEnum.USER],
    };

    const responseDto: UserResponseDto = {
      id: 'user-id',
      email: 'user@example.com',
      fullName: 'John Doe',
      avatarUrl: 'http://example.com/avatar.png',
      phoneNumber: '11912345678',
      isActive: true,
      roles: [
        {
          id: 'role-id',
          name: RoleEnum.USER,
          description: 'Basic user role',
        },
      ],
    };

    it('should register a user successfully', async () => {
      mockServices.execute.mockResolvedValueOnce(responseDto);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-token')
        .send(validDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(responseDto);
          expect(mockServices.execute).toHaveBeenCalled();
        });
    });

    it('should return 409 if email is already in use', async () => {
      mockServices.execute.mockRejectedValueOnce(
        new ConflictException('Email already in use'),
      );

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-token')
        .send(validDto)
        .expect(409)
        .expect((res) => {
          expect(res.body).toEqual({
            statusCode: 409,
            message: 'Email already in use',
            error: 'Conflict',
          });
        });
    });

    it('should return 401 if user is unauthorized', async () => {
      mockServices.execute.mockRejectedValueOnce(
        new UnauthorizedException(
          'You do not have permission to perform this action',
        ),
      );

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-token')
        .send(validDto)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            statusCode: 401,
            message: 'You do not have permission to perform this action',
            error: 'Unauthorized',
          });
        });
    });
  });
});
