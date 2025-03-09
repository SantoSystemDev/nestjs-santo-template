import { UserWithRoles } from '@modules/user/infrastructure/adapters/repositories/interfaces';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database';
import { CreateUserDto, UpdateUserDto } from '@user/application/dtos';
import { RoleModel, UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserModel | null> {
    try {
      return this.mapToDomain(
        await this.prisma.user.findUnique({
          where: { email },
          include: { roles: true },
        }),
      );
    } catch (error) {
      throw this.prisma.handleDatabaseError(error);
    }
  }

  async findById(userId: string): Promise<UserModel | null> {
    try {
      return this.mapToDomain(
        await this.prisma.user.findUnique({
          where: { id: userId },
          include: { roles: true },
        }),
      );
    } catch (error) {
      throw this.prisma.handleDatabaseError(error);
    }
  }

  async createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserModel> {
    try {
      return this.mapToDomain(
        await this.prisma.user.create({
          data: {
            email: createUserDto.email.trim().toLowerCase(),
            password: hashedPassword,
            fullName: createUserDto.fullName.trim().toUpperCase(),
            phoneNumber: createUserDto.phoneNumber ?? null,
            isActive: true,
            roles: {
              connect: createUserDto.roles.map((role) => ({
                name: role.toString(),
              })),
            },
          },
          include: { roles: true },
        }),
      );
    } catch (error) {
      throw this.prisma.handleDatabaseError(error);
    }
  }

  async update(user: UpdateUserDto & { id: string }): Promise<UserModel> {
    try {
      return this.mapToDomain(
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            email: user.email.trim().toLowerCase(),
            fullName: user.fullName.trim().toUpperCase(),
            phoneNumber: user.phoneNumber ?? null,
            isActive: user.isActive,
          },
          include: { roles: true },
        }),
      );
    } catch (error) {
      throw this.prisma.handleDatabaseError(error);
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      throw this.prisma.handleDatabaseError(error);
    }
  }

  async findByEmailAndNotId(
    email: string,
    excludeUserId: string,
  ): Promise<UserModel | null> {
    try {
      return this.mapToDomain(
        await this.prisma.user.findFirst({
          where: {
            email,
            id: { not: excludeUserId },
          },
        }),
      );
    } catch (error) {
      throw this.prisma.handleDatabaseError(error);
    }
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
