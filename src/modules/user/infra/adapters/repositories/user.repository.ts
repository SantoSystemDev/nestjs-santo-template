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
          passwordHash: user.passwordHash,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive ?? true,
          emailVerified: user.emailVerified ?? false,
          organizationId: user.organizationId,
          loginAttempts: user.loginAttempts ?? 0,
          isLocked: user.isLocked ?? false,
          lockedUntil: user.lockedUntil,
          roles: {
            createMany: {
              data: user.roles?.map((role) => ({
                name: role.name,
                description: role.description ?? null,
              })),
              skipDuplicates: true,
            },
          },
        },
        include: { roles: true },
      });
      return this.mapToDomain(createdUser)!;
    });
  }

  async update(
    userId: string,
    data: Partial<UserModel>,
  ): Promise<UserModel> {
    return this.executeTransaction(async () => {
      const updateData: any = {};

      if (data.email !== undefined) updateData.email = data.email;
      if (data.fullName !== undefined) updateData.fullName = data.fullName;
      if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
      if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
      if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;
      if (data.loginAttempts !== undefined) updateData.loginAttempts = data.loginAttempts;
      if (data.isLocked !== undefined) updateData.isLocked = data.isLocked;
      if (data.lockedUntil !== undefined) updateData.lockedUntil = data.lockedUntil;

      const updatedUser = await this.databaseService.user.update({
        where: { id: userId },
        data: updateData,
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
