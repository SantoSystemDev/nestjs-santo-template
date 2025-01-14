// import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateUserDto, UserResponseDto } from '../dtos';
import { CreateUserService } from '../services';

@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: CreateUserService) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already in use',
    content: {
      'application/json': {
        example: {
          statusCode: HttpStatus.CONFLICT,
          message: 'Email already in use',
          error: 'Conflict',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'You do not have permission to perform this action',
    content: {
      'application/json': {
        example: {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'You do not have permission to perform this action',
          error: 'Unauthorized',
        },
      },
    },
  })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request,
  ): Promise<UserResponseDto> {
    // const adminId = request.user['id'];
    return this.userService.register(createUserDto, 'adminId');
  }
}
