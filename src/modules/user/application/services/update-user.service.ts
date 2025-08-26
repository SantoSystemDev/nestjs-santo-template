import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserCommand } from '@user/application/commands';
import { normalizeUserData } from '@user/application/utils';
import { UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class UpdateUserService {
  private readonly logger = new Logger(UpdateUserService.name);

  constructor(private readonly repository: UserRepositoryPort) {}

  async execute(command: UpdateUserCommand): Promise<UserModel> {
    this.logger.log(`Updating user ${command.id}`);

    const currentUser = await this.getCurrentUser(command.id);
    await this.validateEmailChange(command.email, currentUser);

    const updatedData = this.buildUpdateData(command, currentUser);
    const updatedUser = await this.repository.update(updatedData);

    this.logger.log(`User ${updatedUser.id} updated successfully`);
    return updatedUser;
  }

  private async getCurrentUser(userId: string): Promise<UserModel> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async validateEmailChange(
    newEmail: string | undefined,
    currentUser: UserModel,
  ): Promise<void> {
    if (!newEmail || newEmail === currentUser.email) return;

    const emailInUse = await this.repository.findByEmailAndNotId(
      newEmail,
      currentUser.id,
    );

    if (emailInUse) {
      throw new ConflictException('Email already in use');
    }
  }

  private buildUpdateData(
    command: UpdateUserCommand,
    currentUser: UserModel,
  ): UserModel {
    return new UserModel({
      ...currentUser,
      ...normalizeUserData({
        email: command.email,
        fullName: command.fullName,
        phoneNumber: command.phoneNumber,
      }),
      isActive: command.isActive ?? currentUser.isActive,
    });
  }
}
