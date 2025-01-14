import { PrismaService } from '@infra/database';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, RoleResponseDto, UserResponseDto } from '../dtos';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new user with roles.
   * Only admins can perform this action.
   * @param createUserDto User's data
   * @param adminId ID of the authenticated user trying to create a new user
   */
  async register(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto> {
    const { email, password } = createUserDto;

    await this.verifyEmailAndAdminPrivileges(adminId, email);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.createUser(createUserDto, hashedPassword);

    return new UserResponseDto({
      ...newUser,
      roles: this.mapRolesToResponse(newUser.roles),
    });
  }

  /**
   * Maps the roles to the RoleResponseDto.
   */
  private mapRolesToResponse(roles: Role[]): RoleResponseDto[] {
    return roles.map(
      (role) =>
        new RoleResponseDto({
          id: role.id,
          name: role.name as RoleEnum,
          description: role.description,
        }),
    );
  }

  /**
   * Verifies if the email is unique and if the requester has admin privileges.
   */
  private async verifyEmailAndAdminPrivileges(
    adminId: string,
    email: string,
  ): Promise<void> {
    const [existingUser, adminUser] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { email },
      }),
      this.prisma.user.findUnique({
        where: { id: adminId },
        include: { roles: true },
      }),
    ]);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const isAdmin = adminUser?.roles.some(
      (role) => role.name === RoleEnum.ADMIN,
    );
    if (!isAdmin) {
      throw new UnauthorizedException(
        'You do not have permission to perform this action',
      );
    }
  }

  /**
   * Creates a new user in the database.
   */
  private async createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      return await prisma.user.create({
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
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          phoneNumber: true,
          isActive: true,
          roles: { select: { id: true, name: true, description: true } },
        },
      });
    });
  }
}
