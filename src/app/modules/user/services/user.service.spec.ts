import { PrismaService } from '@infra/database';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { CreateUserDto, UserResponseDto } from '../dtos';
import { RoleEnum } from '../enums/role.enum';
import { UserService } from './user.service';

jest.mock('bcrypt');

describe(UserService.name, () => {
  let userService: UserService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  describe('register', () => {
    const adminId = 'admin-id';
    const userId = 'user-id';

    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'John Doe',
        roles: [RoleEnum.USER],
      };

      mockPrismaService.$transaction.mockResolvedValueOnce([
        null,
        {
          id: adminId,
          roles: [{ name: RoleEnum.ADMIN.toString() }],
        },
      ]);

      mockPrismaService.$transaction.mockImplementationOnce(
        async (callback) => {
          return await callback({
            user: {
              create: jest.fn().mockResolvedValue({
                id: userId,
                email: createUserDto.email,
                fullName: createUserDto.fullName,
                avatarUrl: createUserDto.avatarUrl || null,
                phoneNumber: createUserDto.phoneNumber || null,
                isActive: true,
                roles: [
                  {
                    id: 'role-id',
                    name: RoleEnum.USER.toString(),
                    description: 'User role',
                  },
                ],
              }),
            },
          });
        },
      );

      const result: UserResponseDto = await userService.register(
        createUserDto,
        adminId,
      );

      expect(result).toHaveProperty('id');
      expect(result.email).toEqual(createUserDto.email);
      expect(result.fullName).toEqual(createUserDto.fullName);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toEqual(RoleEnum.USER);
    });

    it('should throw an error if email is already in use', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existinguser@example.com',
        password: 'Password123!',
        fullName: 'John Doe',
        roles: [RoleEnum.USER],
      };

      mockPrismaService.$transaction.mockResolvedValueOnce([
        { id: 'existing-user-id', email: 'existinguser@example.com' },
        {
          id: adminId,
          roles: [
            {
              id: 'role-id',
              name: RoleEnum.ADMIN.toString(),
              description: 'Administrator role',
            },
          ],
        },
      ]);

      await expect(
        userService.register(createUserDto, adminId),
      ).rejects.toThrow('Email already in use');
    });

    it('should throw an error if user is not an admin', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        avatarUrl: 'http://avatar.com/avatar.png',
        phoneNumber: '123456789',
        roles: [RoleEnum.USER],
      };

      mockPrismaService.$transaction.mockResolvedValueOnce([
        null,
        {
          id: userId,
          roles: [{ name: RoleEnum.USER.toString() }],
        },
      ]);

      await expect(
        userService.register(createUserDto, adminId),
      ).rejects.toThrow(
        new UnauthorizedException(
          'You do not have permission to perform this action',
        ),
      );
    });

    it('should throw an error if bcrypt hash fails', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        avatarUrl: 'http://avatar.com/avatar.png',
        phoneNumber: '123456789',
        roles: [RoleEnum.USER],
      };

      mockPrismaService.$transaction.mockResolvedValueOnce([
        null,
        {
          id: adminId,
          roles: [{ name: RoleEnum.ADMIN.toString() }],
        },
      ]);

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(
        userService.register(createUserDto, adminId),
      ).rejects.toThrow(new Error('Hashing failed'));
    });

    it('should throw an error if creating user in the database fails', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        avatarUrl: 'http://avatar.com/avatar.png',
        phoneNumber: '123456789',
        roles: [RoleEnum.USER],
      };
      const mockHashedPassword = 'hashedPassword123';

      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      mockPrismaService.$transaction.mockResolvedValueOnce([
        null,
        {
          id: adminId,
          roles: [{ name: RoleEnum.ADMIN.toString() }],
        },
      ]);

      mockPrismaService.$transaction.mockImplementationOnce(
        async (callback) => {
          return await callback({
            user: {
              create: jest.fn().mockRejectedValue(new Error('Database error')),
            },
          });
        },
      );

      await expect(
        userService.register(createUserDto, adminId),
      ).rejects.toThrow(new Error('Database error'));
    });

    it('should throw an error if roles are invalid', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        avatarUrl: 'http://avatar.com/avatar.png',
        phoneNumber: '123456789',
        roles: RoleEnum['ROLE_NOT_FOUND'],
      };

      mockPrismaService.$transaction.mockResolvedValueOnce([
        null,
        {
          id: adminId,
          roles: [{ name: RoleEnum.ADMIN.toString() }],
        },
      ]);

      await expect(
        userService.register(createUserDto, adminId),
      ).rejects.toThrow(
        new Error("Cannot read properties of undefined (reading 'roles')"),
      );
    });

    it('should throw an error if roles are invalid', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        avatarUrl: 'http://avatar.com/avatar.png',
        phoneNumber: '123456789',
        roles: RoleEnum['ROLE_NOT_FOUND'],
      };

      mockPrismaService.$transaction.mockResolvedValueOnce([
        null,
        {
          id: adminId,
          roles: [{ name: RoleEnum.ADMIN.toString() }],
        },
      ]);

      mockPrismaService.$transaction.mockImplementationOnce(
        async (callback) => {
          return await callback({
            user: {
              create: jest.fn().mockResolvedValue({
                id: userId,
                email: createUserDto.email,
                fullName: createUserDto.fullName,
                avatarUrl: createUserDto.avatarUrl || null,
                phoneNumber: createUserDto.phoneNumber || null,
                isActive: true,
              }),
            },
          });
        },
      );

      const result: UserResponseDto = await userService.register(
        createUserDto,
        adminId,
      );

      expect(result).toHaveProperty('id');
      expect(result.email).toEqual(createUserDto.email);
      expect(result.fullName).toEqual(createUserDto.fullName);
      expect(result.roles).toHaveLength(0);
    });
  });
});
