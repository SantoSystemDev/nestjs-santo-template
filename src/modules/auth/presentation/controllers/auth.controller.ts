import { SignupDto } from '@auth/application/dtos';
import { AuthService } from '@auth/application/services';
import { JwtPayloadModel } from '@auth/domain/models';
import {
  JwtAuthGuard,
  PasswordAuthGuard,
} from '@auth/infrastructure/adapters/credentials';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '@shared/decorators';

@Controller('/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    return await this.service.signup(signupDto);
  }

  @Post('/login')
  @UseGuards(PasswordAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@AuthenticatedUser() user: JwtPayloadModel) {
    return await this.service.login(user);
  }

  @Post('/protected')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async protectedRoute(@AuthenticatedUser() user: JwtPayloadModel) {
    return { message: 'You are authorized!', user };
  }
}
