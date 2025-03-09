import {
  CreateUserDto,
  RoleResponseDto,
  UserResponseDto,
} from '@modules/user/application/dtos';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { RoleModel, UserModel } from '@user/domain/models';
import {
  CreateUserServicePort,
  HashServicePort,
  UserRepositoryPort,
} from '@user/domain/ports';
import { CreateUserService } from './create-user.service';

describe(CreateUserService.name, () => {
  let service: CreateUserServicePort;
  let repository: jest.Mocked<UserRepositoryPort>;
  let hashService: jest.Mocked<HashServicePort>;

  const adminId = 'admin-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserService,
        {
          provide: UserRepositoryPort,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: HashServicePort,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CreateUserService>(CreateUserService);
    repository = module.get(UserRepositoryPort);
    hashService = module.get(HashServicePort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(hashService).toBeDefined();
  });

  describe('execute', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        roles: [RoleEnum.USER],
      };

      const adminUser = new UserModel({
        id: adminId,
        email: 'admin@example.com',
        fullName: 'Admin User',
        isActive: true,
        roles: [new RoleModel({ id: 'role-1', name: RoleEnum.ADMIN })],
      });

      repository.findById.mockResolvedValue(adminUser);
      repository.findByEmail.mockResolvedValue(null);
      hashService.hash.mockReturnValue('hashed-password');
      repository.createUser.mockResolvedValue(
        new UserModel({
          id: 'user-123',
          email: createUserDto.email,
          fullName: createUserDto.fullName,
          isActive: true,
          roles: [new RoleModel({ id: 'role-2', name: RoleEnum.USER })],
        }),
      );

      const result = await service.execute(createUserDto, adminId);

      expect(repository.findById).toHaveBeenCalledWith(adminId);
      expect(repository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(hashService.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(repository.createUser).toHaveBeenCalledWith(
        createUserDto,
        'hashed-password',
      );

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.roles).toEqual([
        new RoleResponseDto({ id: 'role-2', name: RoleEnum.USER }),
      ]);
    });

    it('should throw ConflictException if email is already in use', async () => {
      const adminUser = new UserModel({
        id: adminId,
        email: 'admin@example.com',
        fullName: 'Admin User',
        isActive: true,
        roles: [new RoleModel({ id: 'role-1', name: RoleEnum.ADMIN })],
      });

      repository.findById.mockResolvedValue(adminUser);
      repository.findByEmail.mockResolvedValue(
        new UserModel({
          id: 'user-123',
          email: 'existing@example.com',
          isActive: true,
        }),
      );

      await expect(
        service.execute(
          new CreateUserDto({
            email: 'existing@example.com',
            password: '123',
            fullName: 'Test',
            roles: [RoleEnum.USER],
          }),
          'admin-123',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnauthorizedException if user does not have ADMIN role', async () => {
      const nonAdminUser = new UserModel({
        id: 'user-123',
        email: 'user@example.com',
        fullName: 'User',
        isActive: true,
        roles: [new RoleModel({ id: 'role-3', name: RoleEnum.USER })],
      });

      repository.findById.mockResolvedValue(nonAdminUser);

      await expect(
        service.execute(
          new CreateUserDto({
            email: 'new@example.com',
            password: '123',
            fullName: 'Test',
            roles: [RoleEnum.USER],
          }),
          'user-123',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if admin user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.execute(
          new CreateUserDto({
            email: 'new@example.com',
            password: '123',
            fullName: 'Test',
            roles: [RoleEnum.USER],
          }),
          'user-123',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw an error if hash fails', async () => {
      const createUserDto = new CreateUserDto({
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User',
        roles: [RoleEnum.USER],
      });

      const adminUser = new UserModel({
        id: adminId,
        email: 'admin@example.com',
        fullName: 'Admin User',
        isActive: true,
        roles: [new RoleModel({ id: 'role-1', name: RoleEnum.ADMIN })],
      });

      repository.findById.mockResolvedValue(adminUser);
      repository.findByEmail.mockResolvedValue(null);
      hashService.hash.mockImplementation(() => {
        throw new Error('Hashing failed');
      });

      await expect(service.execute(createUserDto, adminId)).rejects.toThrow(
        Error,
      );
    });

    it('should throw an error if creating user in the database fails', async () => {
      const createUserDto = new CreateUserDto({
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User',
        roles: [RoleEnum.USER],
      });

      const adminUser = new UserModel({
        id: adminId,
        email: 'admin@example.com',
        fullName: 'Admin User',
        isActive: true,
        roles: [new RoleModel({ id: 'role-1', name: RoleEnum.ADMIN })],
      });

      repository.findById.mockResolvedValue(adminUser);
      repository.findByEmail.mockResolvedValue(null);
      hashService.hash.mockReturnValue('hashed-password');
      repository.createUser.mockRejectedValue(new Error('Database error'));

      await expect(service.execute(createUserDto, adminId)).rejects.toThrow(
        Error,
      );
    });

    it('should throw an error if roles are empty', async () => {
      const createUserDto = new CreateUserDto({
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User',
        roles: [],
      });

      await expect(service.execute(createUserDto, adminId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw an error if roles are invalid', async () => {
      const createUserDto = new CreateUserDto({
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User',
        roles: ['INVALID_ROLE' as any],
      });

      await expect(service.execute(createUserDto, adminId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
