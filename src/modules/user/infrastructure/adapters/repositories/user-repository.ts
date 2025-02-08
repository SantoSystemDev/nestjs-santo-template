import { CreateUserDto } from '@modules/user/application/dtos';
import { RoleModel, UserModel } from '@modules/user/domain/models';
import { UserRepositoryPort } from '@modules/user/domain/ports';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database';
import { UserWithRoles } from './interfaces';

@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.mapToDomain(
      await this.prisma.user.findUnique({ where: { email } }),
    );
  }

  async findByIdWithRoles(userId: string): Promise<UserModel | null> {
    return this.mapToDomain(
      await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      }),
    );
  }

  async createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserModel> {
    return this.mapToDomain(
      await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          fullName: createUserDto.fullName,
          avatarUrl: createUserDto.avatarUrl,
          phoneNumber: createUserDto.phoneNumber,
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
  }

  private mapToDomain(user?: UserWithRoles): UserModel | null {
    return user
      ? new UserModel({
          ...user,
          roles: user.roles?.map((role) => new RoleModel(role)),
        })
      : null;
  }
}
