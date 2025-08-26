import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserModel } from '@user/domain/models';
import { HashServicePort, UserRepositoryPort } from '@user/domain/ports';
import { PasswordStrategy } from './password.strategy';

describe(PasswordStrategy.name, () => {
  let strategy: PasswordStrategy;
  let userRepository: jest.Mocked<UserRepositoryPort>;
  let hashService: jest.Mocked<HashServicePort>;

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
    } as any;

    hashService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordStrategy,
        { provide: UserRepositoryPort, useValue: userRepository },
        { provide: HashServicePort, useValue: hashService },
      ],
    }).compile();

    strategy = module.get<PasswordStrategy>(PasswordStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
