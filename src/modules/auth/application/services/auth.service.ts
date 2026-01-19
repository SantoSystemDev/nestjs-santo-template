import {
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SignupDto,
  VerifyEmailDto,
} from '@auth/application/dtos';
import { JwtPayloadModel } from '@auth/domain/models';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HashService } from '@user/application/services';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';
import { AUTH_REPOSITORY_TOKENS } from '@auth/infra/repositories/auth.repository.tokens';
import { OrganizationRepositoryPort } from '@auth/domain/ports/organization-repository.port';
import { RefreshTokenRepositoryPort } from '@auth/domain/ports/refresh-token-repository.port';
import { LoginAttemptRepositoryPort } from '@auth/domain/ports/login-attempt-repository.port';
import { EmailServicePort } from '@auth/domain/ports/email-service.port';
import { TokenTypeEnum } from '@auth/domain/enums/token-type.enum';
import { RevokedReasonEnum } from '@auth/domain/enums/revoked-reason.enum';
import { LoginFailureReasonEnum } from '@auth/domain/enums/login-failure-reason.enum';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
    @Inject(AUTH_REPOSITORY_TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepositoryPort,
    @Inject(AUTH_REPOSITORY_TOKENS.REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(AUTH_REPOSITORY_TOKENS.LOGIN_ATTEMPT_REPOSITORY)
    private readonly loginAttemptRepository: LoginAttemptRepositoryPort,
    @Inject(AUTH_REPOSITORY_TOKENS.EMAIL_SERVICE)
    private readonly emailService: EmailServicePort,
  ) {}

  async signup(
    signupDto: SignupDto,
  ): Promise<{ message: string; userId: string }> {
    this.logger.log('Attempting to sign up user');

    if (signupDto.organizationId) {
      const organization = await this.organizationRepository.findById(
        signupDto.organizationId,
      );
      if (!organization) {
        throw new BadRequestException('Organization not found');
      }
    }

    await this.verifyEmailIsAvailable(signupDto.email);

    const hashedPassword = this.hashService.hash(signupDto.password);
    this.logger.log('Password hashed successfully');

    const newUser = UserModel.create({
      email: signupDto.email,
      passwordHash: hashedPassword,
      fullName: signupDto.fullName,
      roles: [RoleEnum.USER],
      organizationId: signupDto.organizationId,
    });

    const user = await this.userRepository.create(newUser);
    this.logger.log(`User signed up successfully - userId: ${user.id}`);

    const verificationToken = await this.generateEmailVerificationToken(
      user.id,
    );
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
    );

    return {
      message:
        'Account created successfully. Please check your email to verify your account.',
      userId: user.id,
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(dto.token);

      if (payload.type !== TokenTypeEnum.EMAIL_VERIFICATION) {
        throw new BadRequestException('Invalid token type');
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.emailVerified) {
        return { message: 'Email already verified' };
      }

      await this.userRepository.update(user.id, { emailVerified: true });

      this.logger.log(`Email verified successfully - userId: ${user.id}`);
      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      return {
        message: 'If the email exists, a verification link has been sent.',
      };
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    const verificationToken = await this.generateEmailVerificationToken(
      user.id,
    );
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
    );

    this.logger.log(
      `Verification email resent successfully - userId: ${user.id}`,
    );
    return {
      message: 'If the email exists, a verification link has been sent.',
    };
  }

  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      roles: RoleEnum[];
      organizationId?: string;
    };
  }> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      await this.loginAttemptRepository.create({
        email,
        ipAddress,
        userAgent,
        success: false,
        failureReason: LoginFailureReasonEnum.EMAIL_NOT_FOUND,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.checkAndUnlockAccount(user);

    if (user.isLocked) {
      await this.loginAttemptRepository.create({
        email,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        failureReason: LoginFailureReasonEnum.ACCOUNT_LOCKED,
      });
      throw new UnauthorizedException(
        'Account temporarily locked. Please try again later or contact support.',
      );
    }

    if (!user.isActive) {
      await this.loginAttemptRepository.create({
        email,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        failureReason: LoginFailureReasonEnum.ACCOUNT_INACTIVE,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      await this.loginAttemptRepository.create({
        email,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        failureReason: LoginFailureReasonEnum.EMAIL_NOT_VERIFIED,
      });
      throw new UnauthorizedException(
        'Email not verified. Please check your inbox.',
      );
    }

    const isPasswordValid = this.hashService.compare(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.loginAttemptRepository.create({
        email,
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        failureReason: LoginFailureReasonEnum.INVALID_PASSWORD,
      });

      await this.checkAndLockAccount(user, email);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.update(user.id, { loginAttempts: 0 });

    await this.loginAttemptRepository.create({
      email,
      userId: user.id,
      ipAddress,
      userAgent,
      success: true,
    });

    const payload: JwtPayloadModel = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = await this.generateRefreshToken(
      user.id,
      ipAddress,
      userAgent,
    );

    await this.refreshTokenRepository.removeOldest(user.id, 10);

    this.logger.log(`User logged in successfully - userId: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((role) => role.name as RoleEnum),
        organizationId: user.organizationId,
      },
    };
  }

  async refreshToken(
    refreshToken: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const jti = this.extractJtiFromToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findByJti(jti);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      await this.refreshTokenRepository.revokeAllByUserId(
        storedToken.userId,
        RevokedReasonEnum.TOKEN_REUSE_DETECTED,
      );
      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been terminated.',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepository.revoke(jti, RevokedReasonEnum.EXPIRED);
      throw new UnauthorizedException('Refresh token expired');
    }

    if (storedToken.tokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const newJti = randomUUID();
    const newRefreshToken = this.jwtService.sign(
      { jti: newJti },
      { expiresIn: '7d' },
    );
    const newTokenHash = this.hashToken(newRefreshToken);

    await this.refreshTokenRepository.revoke(
      jti,
      RevokedReasonEnum.TOKEN_ROTATION,
      newJti,
    );

    await this.refreshTokenRepository.create({
      userId: user.id,
      jti: newJti,
      tokenHash: newTokenHash,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const payload: JwtPayloadModel = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    this.logger.log(`Tokens refreshed successfully - userId: ${user.id}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const jti = this.extractJtiFromToken(refreshToken);
    await this.refreshTokenRepository.revoke(
      jti,
      RevokedReasonEnum.USER_LOGOUT,
    );
    this.logger.log(`User logged out successfully - jti: ${jti}`);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    const resetToken = await this.generatePasswordResetToken(user.id);
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    this.logger.log(
      `Password reset email sent successfully - userId: ${user.id}`,
    );
    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(dto.token);

      if (payload.type !== TokenTypeEnum.PASSWORD_RESET) {
        throw new BadRequestException('Invalid token type');
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const hashedPassword = this.hashService.hash(dto.newPassword);

      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        loginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      });

      await this.refreshTokenRepository.revokeAllByUserId(
        user.id,
        RevokedReasonEnum.PASSWORD_RESET,
      );

      await this.emailService.sendPasswordChangedEmail(user.email);

      this.logger.log(`Password reset successfully - userId: ${user.id}`);
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async unlockAccount(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.userRepository.update(userId, {
      isLocked: false,
      lockedUntil: null,
      loginAttempts: 0,
    });

    this.logger.log(`Account unlocked manually - userId: ${userId}`);
    return { message: 'Account unlocked successfully' };
  }

  private async checkAndUnlockAccount(user: UserModel): Promise<void> {
    if (user.isLocked && user.lockedUntil && user.lockedUntil < new Date()) {
      await this.userRepository.update(user.id, {
        isLocked: false,
        lockedUntil: null,
        loginAttempts: 0,
      });
      this.logger.log(`Account unlocked automatically - userId: ${user.id}`);
    }
  }

  private async checkAndLockAccount(
    user: UserModel,
    email: string,
  ): Promise<void> {
    const recentFailures =
      await this.loginAttemptRepository.countRecentFailures(email, 15);

    if (recentFailures >= 5) {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      await this.userRepository.update(user.id, {
        isLocked: true,
        lockedUntil,
      });

      await this.emailService.sendAccountLockedEmail(user.email, lockedUntil);
      this.logger.warn(
        `Account locked due to failed attempts - userId: ${user.id}`,
      );
    } else {
      await this.userRepository.update(user.id, {
        loginAttempts: user.loginAttempts + 1,
      });
    }
  }

  private async generateEmailVerificationToken(
    userId: string,
  ): Promise<string> {
    const payload = {
      userId,
      type: TokenTypeEnum.EMAIL_VERIFICATION,
    };
    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  private async generatePasswordResetToken(userId: string): Promise<string> {
    const payload = {
      userId,
      type: TokenTypeEnum.PASSWORD_RESET,
    };
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  private async generateRefreshToken(
    userId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<string> {
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign({ jti }, { expiresIn: '7d' });
    const tokenHash = this.hashToken(refreshToken);

    await this.refreshTokenRepository.create({
      userId,
      jti,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return refreshToken;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private extractJtiFromToken(token: string): string {
    try {
      const payload = this.jwtService.decode(token) as { jti: string };
      return payload.jti;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async verifyEmailIsAvailable(email: string): Promise<void> {
    this.logger.log('Checking if the email is already registered');

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      this.logger.error('Signup attempt failed - email already in use');
      throw new ConflictException(
        'Unable to complete signup. Please contact support if the issues persists.',
      );
    }

    this.logger.log('Email is available for registration');
  }
}
