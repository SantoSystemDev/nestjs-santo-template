import { CreateUserDto, UserResponseDto } from '@modules/user/application/dtos';

export abstract class CreateUserServicePort {
  abstract execute(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto>;
}
