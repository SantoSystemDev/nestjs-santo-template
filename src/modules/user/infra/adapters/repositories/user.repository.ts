import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database';
import { BaseRepository } from '@shared/database/base.repository';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { RoleModel, UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';
import { UserWithRoles } from '@user/infra/adapters/repositories/interfaces';

@Injectable()
export class UserRepository
  extends BaseRepository
  implements UserRepositoryPort
{
  constructor(databaseService: PrismaService) {
    super(databaseService);
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.executeQuery(async () => {
      const user = await this.databaseService.user.findUnique({
        where: { email },
        include: { roles: true },
      });
      return this.mapToDomain(user);
    });
  }

  async findById(userId: string): Promise<UserModel | null> {
    return this.executeQuery(async () => {
      const user = await this.databaseService.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      return this.mapToDomain(user);
    });
  }

  async create(user: UserModel): Promise<UserModel> {
    return this.executeTransaction(async () => {
      const createdUser = await this.databaseService.user.create({
        data: {
          email: user.email,
          passwordHash: user.passwordHash, // Assume que já está hasheado
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          isActive: true,
          emailVerified: false,
          // cria as roles junto ao usuário; o Prisma seta userId automaticamente
          roles: {
            createMany: {
              data: user.roles?.map((role) => ({
                name: role.name,
                description: role.description ?? null,
              })),
              skipDuplicates: true, // banco tem @@unique([userId, name]); evita erro
            },
          },
        },
        include: { roles: true },
      });
      return this.mapToDomain(createdUser)!;
    });
  }

  async update(user: UserModel): Promise<UserModel> {
    return this.executeTransaction(async () => {
      const updatedUser = await this.databaseService.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          // Note: Roles are not updated here. Role management should be handled separately.
        },
        include: { roles: true },
      });
      return this.mapToDomain(updatedUser)!;
    });
  }

  async delete(userId: string): Promise<void> {
    return this.executeQuery(async () => {
      await this.databaseService.user.delete({
        where: { id: userId },
      });
    });
  }

  async findRoles(userId: string): Promise<RoleEnum[]> {
    return this.executeQuery(async () => {
      const roles = await this.databaseService.userRole.findMany({
        where: { userId },
      });
      return roles.map((role) => role.name as RoleEnum);
    });
  }

  async findByEmailAndNotId(
    email: string,
    excludeUserId: string,
  ): Promise<UserModel | null> {
    return this.executeQuery(async () => {
      const user = await this.databaseService.user.findFirst({
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
   *
   * Converts the user's roles to RoleModel instances.
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
