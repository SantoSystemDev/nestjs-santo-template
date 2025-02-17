import { LoginDto, SignupDto } from '@auth/application/dtos';
import { AuthService } from '@auth/application/services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { RoleModel, UserModel } from '@user/domain/models';
import { HashServicePort, UserRepositoryPort } from '@user/domain/ports';

describe(AuthService.name, () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepositoryPort>;
  let hashService: jest.Mocked<HashServicePort>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const userRepositoryMock: jest.Mocked<UserRepositoryPort> = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
    };

    const hashServiceMock: jest.Mocked<HashServicePort> = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    const jwtServiceMock: jest.Mocked<JwtService> = {
      sign: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepositoryPort, useValue: userRepositoryMock },
        { provide: HashServicePort, useValue: hashServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepositoryPort);
    hashService = module.get(HashServicePort);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(hashService).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user and return an access token', async () => {
      const signupDto: SignupDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      const hashedPassword = 'hashed_password';
      const user = new UserModel({
        id: '123',
        email: signupDto.email,
        password: hashedPassword,
        fullName: signupDto.fullName,
        isActive: true,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      hashService.hash.mockReturnValue(hashedPassword);
      userRepository.createUser.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('valid_token');

      const result = await service.signup(signupDto);

      expect(userRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: signupDto.email,
          fullName: signupDto.fullName,
        }),
        hashedPassword,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: user.id,
        email: user.email,
        roles: [RoleEnum.USER],
      });
      expect(result).toEqual({ accessToken: 'valid_token' });
    });
  });

  describe('login', () => {
    it('should authenticate a valid user and return an access token', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = new UserModel({
        id: '123',
        email: loginDto.email,
        password: 'hashed_password',
        fullName: 'Test User',
        isActive: true,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      userRepository.findByEmail.mockResolvedValue(user);
      hashService.compare.mockReturnValue(true);
      jwtService.sign.mockReturnValue('valid_token');

      const result = await service.login(loginDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(hashService.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: user.id,
        email: user.email,
        roles: [RoleEnum.USER],
      });
      expect(result).toEqual({ accessToken: 'valid_token' });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const user = new UserModel({
        id: '123',
        email: loginDto.email,
        password: 'hashed_password',
        fullName: 'Test User',
        isActive: true,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      userRepository.findByEmail.mockResolvedValue(user);
      hashService.compare.mockReturnValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user payload when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const user = new UserModel({
        id: '123',
        email,
        password: 'hashed_password',
        fullName: 'Test User',
        isActive: true,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      userRepository.findByEmail.mockResolvedValue(user);
      hashService.compare.mockReturnValue(true);

      const result = await (service as any).validateUser(email, password);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(hashService.compare).toHaveBeenCalledWith(password, user.password);
      expect(result).toEqual({
        userId: user.id,
        email: user.email,
        roles: [RoleEnum.USER],
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        (service as any).validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const user = new UserModel({
        id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        fullName: 'Test User',
        isActive: true,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      userRepository.findByEmail.mockResolvedValue(user);
      hashService.compare.mockReturnValue(false);

      await expect(
        (service as any).validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
