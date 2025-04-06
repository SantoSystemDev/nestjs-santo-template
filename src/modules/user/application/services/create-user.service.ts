import {
  CreateUserDto,
  RoleResponseDto,
  UserResponseDto,
} from '@modules/user/application/dtos';
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
    await this.verifyAdminPermissionsAndEmailIsAvailable(adminId, email);

    const hashedPassword = this.hashService.hash(password);
    this.logger.log('Password hashed successfully');

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

  private async verifyAdminPermissionsAndEmailIsAvailable(
    adminId: string,
    email: string,
  ): Promise<void> {
    this.logger.log(`Verifying admin permissions - adminId: ${adminId}`);

    const [adminUser, existingUser] = await Promise.all([
      this.repository.findById(adminId),
      this.repository.findByEmail(email),
    ]);

    if (!adminUser?.hasRole(RoleEnum.ADMIN)) {
      this.logger.error(
        `Unauthorized user creation attempt - userId: ${adminId}`,
      );
      throw new UnauthorizedException(
        'You do not have permission to perform this action',
      );
    }

    if (existingUser) {
      this.logger.error('Attempt to create duplicate user');
      throw new ConflictException('Email already in use');
    }
  }
}
