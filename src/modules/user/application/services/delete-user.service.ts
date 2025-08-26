import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class DeleteUserService {
  private readonly logger = new Logger(DeleteUserService.name);

  constructor(private readonly repository: UserRepositoryPort) {}

  async execute(id: string, adminId: string): Promise<void> {
    await this.verifyAdminPermissionsAndUserExists(id, adminId);
    await this.repository.delete(id);
  }

  private async verifyAdminPermissionsAndUserExists(
    id: string,
    adminId: string,
  ): Promise<void> {
    this.logger.log(`Verifying admin permissions - adminId: ${adminId}`);

    const [adminUser, existingUser] = await Promise.all([
      this.repository.findById(adminId),
      this.repository.findById(id),
    ]);

    if (!adminUser?.hasRole(RoleEnum.ADMIN)) {
      this.logger.error(
        `Unauthorized user deletion attempt - userId: ${adminId}`,
      );
      throw new UnauthorizedException(
        'You do not have permission to perform this action',
      );
    }

    if (!existingUser) {
      this.logger.error('Attempt to delete non-existent user');
      throw new NotFoundException('User not found');
    }
  }
}
