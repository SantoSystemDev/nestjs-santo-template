import { RoleEnum } from '@modules/user/domain/enums/role.enum';
import { RoleModel, UserModel } from '@modules/user/domain/models';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RoleResponseDto,
  UpdateUserDto,
  UserResponseDto,
} from '@user/application/dtos';
import { UpdateUserServicePort, UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class UpdateUserService implements UpdateUserServicePort {
  private readonly logger = new Logger(UpdateUserService.name);

  constructor(private readonly repository: UserRepositoryPort) {}

  async execute(
    id: string,
    updateUserDto: UpdateUserDto,
    // loggedUserId: string,
  ): Promise<UserResponseDto> {
    this.logger.log(`Updating user - userId: ${id}`);

    const user = await this.verifyUserExists(id);
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.verifyEmailIsAvailable(updateUserDto.email, user.id);
    }

    const updatedUser = await this.repository.update({
      id,
      email: updateUserDto.email ?? user.email,
      fullName: updateUserDto.fullName ?? user.fullName,
      phoneNumber: updateUserDto.phoneNumber ?? user.phoneNumber,
      isActive: updateUserDto.isActive ?? user.isActive,
    });

    // const updatedUser = await this.repository.update({ ...updateUserDto, id });
    this.logger.log(`User updated successfully - userId: ${updatedUser.id}`);

    return new UserResponseDto({
      ...updatedUser,
      roles: this.mapRolesToResponse(updatedUser.roles),
    });
  }

  private mapRolesToResponse(roles: RoleModel[]): RoleResponseDto[] {
    return roles.map(
      (role) =>
        new RoleResponseDto({
          id: role.id,
          name: role.name as RoleEnum,
          description: role.description,
        }),
    );
  }

  private async verifyUserExists(userId: string): Promise<UserModel> {
    this.logger.log(`Checking if user exists - userId: ${userId}`);

    const existingUser = await this.repository.findById(userId);
    if (!existingUser) {
      this.logger.error('Attempt to update non-existent user');
      throw new NotFoundException('User not found');
    }

    this.logger.log(`User validation successful - userId: ${userId}`);
    return existingUser;
  }

  private async verifyEmailIsAvailable(
    email: string,
    id: string,
  ): Promise<void> {
    this.logger.log('Checking if the email is already registered');

    const existingUser = await this.repository.findByEmailAndNotId(email, id);
    if (existingUser) {
      this.logger.error('Update attempt failed - email already in use');
      throw new ConflictException('Email already in use');
    }

    this.logger.log('Email is available for registration');
  }
}
