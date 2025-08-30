import { RoleEnum } from '@user/domain/enums/role.enum';
import { RoleModel, UserModel } from '@user/domain/models';
import { RoleResponseDto, UserResponseDto } from '@user/presentation/dtos';

export class UserResponseMapper {
  static fromDomainList(users: UserModel[]): UserResponseDto[] {
    return users.map(this.fromDomain);
  }

  static fromDomain(user: UserModel): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      roles: this.fromDomainRoles(user.roles || []),
    });
  }

  private static fromDomainRoles(roles: RoleModel[]): RoleResponseDto[] {
    return roles.map(this.fromDomainRole);
  }

  private static fromDomainRole(role: RoleModel): RoleResponseDto {
    return new RoleResponseDto({
      ...role,
      name: role.name as RoleEnum,
    });
  }
}
