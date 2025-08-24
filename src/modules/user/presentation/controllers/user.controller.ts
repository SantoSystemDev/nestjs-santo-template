import { JwtAuthGuard } from '@auth/infrastructure/adapters/credentials';
import {
  UserApiResponseDelete,
  UserApiResponsePost,
  UserApiResponsePut,
} from './user.swagger';
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
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedUser } from '@shared/decorators';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '@modules/user/presentation/dtos';
import { CreateUserCommand, UpdateUserCommand } from '@user/domain/commands';
import {
  CreateUserService,
  DeleteUserService,
  UpdateUserService,
} from '@user/application/services';
import { UserResponseMapper } from '@user/presentation/mappers';

@ApiBearerAuth()
@Controller('/users')
export class UserController {
  constructor(
    private readonly createUserService: CreateUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly deleteUserService: DeleteUserService,
  ) {}

  @Post()
  @UserApiResponsePost()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() request: CreateUserDto,
    @AuthenticatedUser('userId') adminId: string,
  ): Promise<UserResponseDto> {
    // Converter DTO para Command (responsabilidade da camada de apresentação)
    const command = new CreateUserCommand({ ...request, adminId });

    // Executar comando e obter modelo de domínio
    const user = await this.createUserService.execute(command);

    // Converter modelo de domínio para DTO de resposta
    return UserResponseMapper.fromDomain(user);
  }

  @Put(':id')
  @UserApiResponsePut()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() request: UpdateUserDto,
    @AuthenticatedUser('userId') loggedUserId: string,
  ): Promise<UserResponseDto> {
    // Converter DTO para Command (responsabilidade da camada de apresentação)
    const command = new UpdateUserCommand({ ...request, id, loggedUserId });

    // Executar comando e obter modelo de domínio
    const user = await this.updateUserService.execute(command);

    // Executar comando e obter DTO de resposta (temporário - service deveria retornar UserModel)
    return UserResponseMapper.fromDomain(user);
  }

  @Delete(':id')
  @UserApiResponseDelete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @AuthenticatedUser('userId') adminId: string,
  ): Promise<void> {
    return await this.deleteUserService.execute(id, adminId);
  }
}
