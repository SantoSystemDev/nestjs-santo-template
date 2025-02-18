import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { RoleModel } from '@user/domain/models';
import {
  CreateUserServicePort,
  HashServicePort,
  UserRepositoryPort,
} from '@user/domain/ports';
import { CreateUserDto, RoleResponseDto, UserResponseDto } from '../dtos';

@Injectable()
export class CreateUserService implements CreateUserServicePort {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    private readonly repository: UserRepositoryPort,
    private readonly hashService: HashServicePort,
  ) {}

  async execute(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto> {
    this.logger.log(`Creating new user - Requested by adminId: ${adminId}`);

    const { email, password } = createUserDto;
    await this.verifyEmailAndAdminPrivileges(adminId, email);

    const hashedPassword = this.hashService.hash(password);
    this.logger.debug('Password hashed successfully');

    const newUser = await this.repository.createUser(
      createUserDto,
      hashedPassword,
    );
    this.logger.log(`User created successfully - userId: ${newUser.id}`);

    return new UserResponseDto({
      ...newUser,
      roles: this.mapRolesToResponse(newUser.roles),
    });
  }

  /**
   * Maps an array of RoleModel to an array of RoleResponseDto.
   *
   * @param roles Array of RoleModel
   * @returns Array of RoleResponseDto
   */
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

  /**
   * Verifies that the email is not already in use and that the authenticated
   * user has the ADMIN role. If either condition fails, an error is thrown.
   *
   * @param adminId ID of the authenticated user trying to create a new user
   * @param email Email of the new user
   */
  private async verifyEmailAndAdminPrivileges(
    adminId: string,
    email: string,
  ): Promise<void> {
    this.logger.log(`Verifying admin permissions - adminId: ${adminId}`);

    const [existingUser, adminUser] = await Promise.all([
      this.repository.findByEmail(email),
      this.repository.findById(adminId),
    ]);

    if (existingUser) {
      this.logger.error('Attempt to create duplicate user');
      throw new ConflictException('Email already in use');
    }

    if (!adminUser?.hasRole(RoleEnum.ADMIN)) {
      this.logger.error(
        `Unauthorized user creation attempt - adminId: ${adminId}`,
      );
      throw new UnauthorizedException(
        'You do not have permission to perform this action',
      );
    }
  }
}
