import { RoleModel } from '@modules/user/domain/models';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleEnum } from '../../domain/enums/role.enum';
import {
  CreateUserServicePort,
  HashServicePort,
  UserRepositoryPort,
} from '../../domain/ports';
import { CreateUserDto, RoleResponseDto, UserResponseDto } from '../dtos';

@Injectable()
export class CreateUserService implements CreateUserServicePort {
  constructor(
    private readonly repository: UserRepositoryPort,
    private readonly hashService: HashServicePort,
  ) {}

  /**
   * Register a new user with roles.
   * Only admins can perform this action.
   * @param createUserDto User's data
   * @param adminId ID of the authenticated user trying to create a new user
   */
  async execute(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto> {
    const { email, password } = createUserDto;

    await this.verifyEmailAndAdminPrivileges(adminId, email);

    const hashedPassword = this.hashService.hash(password);
    const newUser = await this.repository.createUser(
      createUserDto,
      hashedPassword,
    );

    return new UserResponseDto({
      ...newUser,
      roles: this.mapRolesToResponse(newUser.roles),
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

  private async verifyEmailAndAdminPrivileges(
    adminId: string,
    email: string,
  ): Promise<void> {
    const [existingUser, adminUser] = await Promise.all([
      this.repository.findByEmail(email),
      this.repository.findByIdWithRoles(adminId),
    ]);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    if (!adminUser?.hasRole(RoleEnum.ADMIN)) {
      throw new UnauthorizedException(
        'You do not have permission to perform this action',
      );
    }
  }
}
