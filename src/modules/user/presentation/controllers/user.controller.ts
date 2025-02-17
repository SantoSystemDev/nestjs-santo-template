import { JwtAuthGuard } from '@auth/infrastructure/adapters/credentials';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser } from '@shared/decorators';
import { CreateUserDto, UserResponseDto } from '@user/application/dtos';
import { CreateUserServicePort } from '@user/domain/ports';

@ApiBearerAuth()
@Controller('/users')
export class UserController {
  constructor(private readonly service: CreateUserServicePort) {}

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
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
    @AuthenticatedUser('userId') adminId: string,
  ): Promise<UserResponseDto> {
    return await this.service.execute(createUserDto, adminId);
  }
}
