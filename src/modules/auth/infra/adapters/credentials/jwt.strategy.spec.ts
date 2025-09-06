import { JwtPayloadModel } from '@auth/domain/models';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';
import { JwtStrategy } from './jwt.strategy';

describe(JwtStrategy.name, () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<UserRepositoryPort>;

  beforeEach(async () => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UserRepositoryPort, useValue: userRepository },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate a valid user and return payload', async () => {
    const payload: JwtPayloadModel = {
      userId: '123',
      email: 'test@example.com',
      roles: [],
    };
    const user = new UserModel({
      id: '123',
      email: 'test@example.com',
      isActive: true,
      roles: [],
    });

    userRepository.findById.mockResolvedValue(user);

    const result = await strategy.validate(payload);

    expect(userRepository.findById).toHaveBeenCalledWith(payload.userId);
    expect(result).toEqual({ userId: user.id, email: user.email, roles: [] });
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({
        userId: '123',
        email: 'test@example.com',
        roles: [],
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    const user = new UserModel({
      id: '123',
      email: 'test@example.com',
      isActive: false,
      roles: [],
    });

    userRepository.findById.mockResolvedValue(user);

    await expect(
      strategy.validate({
        userId: '123',
        email: 'test@example.com',
        roles: [],
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
