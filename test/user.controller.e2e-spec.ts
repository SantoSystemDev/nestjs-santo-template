import { UserController } from '@app/modules/user/controllers';
import { CreateUserDto, UserResponseDto } from '@app/modules/user/dtos';
import { RoleEnum } from '@app/modules/user/enums/role.enum';
import { CreateUserService } from '@app/modules/user/services';
import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

describe(UserController.name, () => {
  let app: INestApplication;

  const mockUserService = {
    register: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: CreateUserService, useValue: mockUserService }],
    }).compile();

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
      mockUserService.register.mockResolvedValue(responseDto);

      await request(app.getHttpServer())
        .post('/users')
        .send(validDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(responseDto);
        });
    });

    it('should return 409 if email is already in use', async () => {
      mockUserService.register.mockRejectedValue(
        new ConflictException('Email already in use'),
      );

      await request(app.getHttpServer())
        .post('/users')
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
      mockUserService.register.mockRejectedValue(
        new UnauthorizedException(
          'You do not have permission to perform this action',
        ),
      );

      await request(app.getHttpServer())
        .post('/users')
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
