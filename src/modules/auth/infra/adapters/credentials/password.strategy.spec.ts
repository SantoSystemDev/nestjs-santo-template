import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HashService } from '@user/application/services';
import { UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';
import { PasswordStrategy } from './password.strategy';

describe(PasswordStrategy.name, () => {
  let strategy: PasswordStrategy;
  let userRepository: jest.Mocked<UserRepositoryPort>;
  let hashService: jest.Mocked<HashService>;

  beforeEach(async () => {
    const userRepositoryMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
    } as any;

    const hashServiceMock = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordStrategy,
        { provide: UserRepositoryPort, useValue: userRepositoryMock },
        { provide: HashService, useValue: hashServiceMock },
      ],
    }).compile();

    strategy = module.get(PasswordStrategy);
    userRepository = module.get(UserRepositoryPort);
    hashService = module.get(HashService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(hashService).toBeDefined();
  });

  it('should validate user credentials and return payload', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const user = new UserModel({
      id: '123',
      email,
      password: 'hashed_password',
      isActive: true,
      roles: [],
    });

    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockReturnValue(true);

    const result = await strategy.validate(email, password);

    expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(hashService.compare).toHaveBeenCalledWith(password, user.password);
    expect(result).toEqual({ userId: user.id, email: user.email, roles: [] });
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      strategy.validate('test@example.com', 'password123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    const user = new UserModel({
      id: '123',
      email: 'test@example.com',
      password: 'hashed_password',
      isActive: false,
      roles: [],
    });

    userRepository.findByEmail.mockResolvedValue(user);

    await expect(
      strategy.validate('test@example.com', 'password123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if password is incorrect', async () => {
    const user = new UserModel({
      id: '123',
      email: 'test@example.com',
      password: 'hashed_password',
      isActive: true,
      roles: [],
    });

    userRepository.findByEmail.mockResolvedValue(user);
    hashService.compare.mockReturnValue(false);

    await expect(
      strategy.validate('test@example.com', 'wrongpassword'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
