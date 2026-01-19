import {
  SignupDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from '@auth/application/dtos';
import { AuthService } from '@auth/application/services';
import { JwtPayloadModel } from '@auth/domain/models';
import { JwtAuthGuard } from '@auth/infra/adapters/credentials';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
  Res,
  Param,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@shared/decorators';
import { Request, Response } from 'express';
import { RoleEnum } from '@user/domain/enums/role.enum';

@Controller('/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    return await this.service.signup(signupDto);
  }

  @Post('/verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return await this.service.verifyEmail(dto);
  }

  @Post('/resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return await this.service.resendVerification(dto);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    const result = await this.service.login(
      dto.email,
      dto.password,
      ipAddress,
      userAgent,
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    const result = await this.service.refreshToken(
      refreshToken,
      ipAddress,
      userAgent,
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken || req.cookies?.refreshToken;
    if (refreshToken) {
      await this.service.logout(refreshToken);
    }

    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.service.forgotPassword(dto);
  }

  @Post('/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.service.resetPassword(dto);
  }

  @Post('/admin/unlock-account/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlockAccount(
    @Param('userId') userId: string,
    @AuthenticatedUser() user: JwtPayloadModel,
  ) {
    if (!user.roles.includes(RoleEnum.SUPER_ADMIN)) {
      throw new ForbiddenException('Only SUPER_ADMIN can unlock user accounts');
    }
    return await this.service.unlockAccount(userId);
  }
}
