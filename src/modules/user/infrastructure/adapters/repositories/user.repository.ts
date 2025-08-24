import { UserWithRoles } from '@modules/user/infrastructure/adapters/repositories/interfaces';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@shared/database/base.repository';
import { PrismaService } from '@shared/database';
import { RoleModel, UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class UserRepository
  extends BaseRepository
  implements UserRepositoryPort
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.executeQuery(async () => {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { roles: true },
      });
      return this.mapToDomain(user);
    });
  }

  async findById(userId: string): Promise<UserModel | null> {
    return this.executeQuery(async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      return this.mapToDomain(user);
    });
  }

  async createUser(user: UserModel): Promise<UserModel> {
    return this.executeQuery(async () => {
      const createdUser = await this.prisma.user.create({
        data: {
          email: user.email,
          password: user.password, // Assume que já está hasheado
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          isActive: true,
          roles: {
            connect:
              user.roles?.map((role) => ({
                name: role.name,
              })) || [],
          },
        },
        include: { roles: true },
      });
      return this.mapToDomain(createdUser)!;
    });
  }

  async update(user: UserModel): Promise<UserModel> {
    return this.executeQuery(async () => {
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          // Note: Roles are not updated here. Role management should be handled separately.
        },
        include: { roles: true },
      });
      return this.mapToDomain(updatedUser)!;
    });
  }

  async delete(userId: string): Promise<void> {
    return this.executeQuery(async () => {
      await this.prisma.user.delete({
        where: { id: userId },
      });
    });
  }

  async findByEmailAndNotId(
    email: string,
    excludeUserId: string,
  ): Promise<UserModel | null> {
    return this.executeQuery(async () => {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          id: { not: excludeUserId },
        },
        include: { roles: true },
      });
      return this.mapToDomain(user);
    });
  }

  /**
   * Maps a UserWithRoles object to a UserModel.
   * Converts the user's roles to RoleModel instances.
   *
   * @param user UserWithRoles object to map
   * @returns A UserModel object if user is defined, null otherwise
   */
  private mapToDomain(user?: UserWithRoles): UserModel | null {
    return user
      ? new UserModel({
          ...user,
          roles: user.roles?.map((role) => new RoleModel(role)),
        })
      : null;
  }
}
