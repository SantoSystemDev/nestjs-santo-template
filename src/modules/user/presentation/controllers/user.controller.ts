import { JwtAuthGuard } from '@auth/infrastructure/adapters/credentials';
import { ApiUserPost } from '@modules/user/presentation/controllers/user.swagger';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser } from '@shared/decorators';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '@user/application/dtos';
import {
  CreateUserServicePort,
  DeleteUserServicePort,
  UpdateUserServicePort,
} from '@user/domain/ports';

@ApiBearerAuth()
@Controller('/users')
export class UserController {
  constructor(
    private readonly createUserService: CreateUserServicePort,
    private readonly updateUserService: UpdateUserServicePort,
    private readonly deleteUserService: DeleteUserServicePort,
  ) {}

  @Post()
  @ApiUserPost()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
    @AuthenticatedUser('userId') adminId: string,
  ): Promise<UserResponseDto> {
    return await this.createUserService.execute(createUserDto, adminId);
  }

  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    content: {
      'application/json': {
        example: {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          error: 'Not Found',
        },
      },
    },
  })
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @AuthenticatedUser('userId') loggedUserId: string,
  ): Promise<UserResponseDto> {
    return await this.updateUserService.execute(
      id,
      updateUserDto,
      loggedUserId,
    );
  }

  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    content: {
      'application/json': {
        example: {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          error: 'Not Found',
        },
      },
    },
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @AuthenticatedUser('userId') adminId: string,
  ): Promise<void> {
    return await this.deleteUserService.execute(id, adminId);
  }
}
