import { SignupDto } from '@auth/application/dtos';
import { JwtPayloadModel } from '@auth/domain/models';
import { AuthServicePort } from '@auth/domain/ports';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '@user/application/dtos';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { HashServicePort, UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class AuthService implements AuthServicePort {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly hashService: HashServicePort,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ accessToken: string }> {
    this.logger.debug(`Attempting to sign up user`);

    await this.verifyEmail(signupDto.email);

    const hashedPassword = this.hashService.hash(signupDto.password);
    this.logger.debug(`Password hashed successfully`);

    const createUserDto: CreateUserDto = {
      email: signupDto.email,
      password: signupDto.password,
      fullName: signupDto.fullName,
      roles: [RoleEnum.USER],
    };
    const user = await this.userRepository.createUser(
      createUserDto,
      hashedPassword,
    );
    this.logger.log(`User signed up successfully - userId: ${user.id}`);

    const payload: JwtPayloadModel = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
    };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async login(payload: JwtPayloadModel): Promise<{ accessToken: string }> {
    await this.verifyId(payload.userId);
    this.logger.log(`User logged in successfully - userId: ${payload.userId}`);
    return { accessToken: this.jwtService.sign(payload) };
  }

  /**
   * Verifies that the email is not already in use.
   *
   * @param email Email to check
   * @throws ConflictException if the email is already in use
   */
  private async verifyEmail(email: string): Promise<void> {
    this.logger.debug('Checking if the email is already registered');

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      this.logger.error('Signup attempt failed - email already in use');
      throw new ConflictException('Email already in use');
    }

    this.logger.debug('Email is available for registration');
  }

  /**
   * Verifies that the user ID is valid and the user is active.
   *
   * @param userId ID of the user to verify
   * @throws UnauthorizedException if the user ID is invalid or the user is not active
   */
  private async verifyId(userId: string): Promise<void> {
    this.logger.debug(
      `Checking if user exists and is active - userId: ${userId}`,
    );

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser || !existingUser.isActive) {
      this.logger.error(`Unauthorized access attempt - userId: ${userId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.debug(`User validation successful - userId: ${userId}`);
  }
}
