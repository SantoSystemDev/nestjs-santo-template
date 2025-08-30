import { SignupDto } from '@auth/application/dtos';
import { AuthService } from '@auth/application/services/auth.service';
import { JwtPayloadModel } from '@auth/domain/models';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
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
      update: jest.fn(),
      delete: jest.fn(),
      findByEmailAndNotId: jest.fn(),
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

      // Mocking dependencies
      hashService.hash.mockReturnValue(hashedPassword);
      userRepository.createUser.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('valid_token');

      // Calling the signup method
      const result = await service.signup(signupDto);

      // Asserts for user creation and JWT sign
      expect(userRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: signupDto.email,
          fullName: signupDto.fullName,
          password: hashedPassword,
        }),
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: user.id,
        email: user.email,
        roles: [RoleEnum.USER],
      });
      expect(result).toEqual({ accessToken: 'valid_token' });
    });

    it('should throw ConflictException when email is already in use', async () => {
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

      userRepository.findByEmail.mockResolvedValue(user);

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw an error if password hashing fails', async () => {
      const signupDto: SignupDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      const errorMessage = 'Hashing failed';
      hashService.hash.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      await expect(service.signup(signupDto)).rejects.toThrow(errorMessage);
    });

    it('should throw an error if required fields are missing in signup', async () => {
      const signupDto: SignupDto = {
        email: '',
        password: 'password123',
        fullName: 'Test User',
      };

      await expect(service.signup(signupDto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should authenticate a valid user and return an access token', async () => {
      const payload: JwtPayloadModel = {
        userId: '123',
        email: 'test@example.com',
        roles: [RoleEnum.USER],
      };

      const user = new UserModel({
        id: payload.userId,
        email: payload.email,
        password: 'hashed_password',
        fullName: 'Test User',
        isActive: true,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      // Mocking repository response
      userRepository.findById.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('valid_token');

      // Calling the login method
      const result = await service.login(payload);

      // Asserts
      expect(userRepository.findById).toHaveBeenCalledWith(payload.userId);
      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles,
      });
      expect(result).toEqual({ accessToken: 'valid_token' });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const payload: JwtPayloadModel = {
        userId: 'non-existent-id',
        email: 'test@example.com',
        roles: [RoleEnum.USER],
      };

      userRepository.findById.mockResolvedValue(null);

      await expect(service.login(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findById).toHaveBeenCalledWith(payload.userId);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const payload: JwtPayloadModel = {
        userId: '123',
        email: 'test@example.com',
        roles: [RoleEnum.USER],
      };

      const inactiveUser = new UserModel({
        id: payload.userId,
        email: payload.email,
        password: 'hashed_password',
        fullName: 'Test User',
        isActive: false,
        roles: [new RoleModel({ id: '1', name: RoleEnum.USER })],
      });

      userRepository.findById.mockResolvedValue(inactiveUser);

      await expect(service.login(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findById).toHaveBeenCalledWith(payload.userId);
    });
  });
});
