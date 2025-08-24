import { RoleModel, UserModel } from '@user/domain/models';
import { UserResponseDto, RoleResponseDto } from '@user/presentation/dtos';
import { RoleEnum } from '@user/domain/enums/role.enum';

export class UserResponseMapper {
  static fromDomainList(users: UserModel[]): UserResponseDto[] {
    return users.map(this.fromDomain);
  }

  static fromDomain(user: UserModel): UserResponseDto {
    return new UserResponseDto({
      ...user,
      roles: this.fromDomainRoles(user.roles),
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
