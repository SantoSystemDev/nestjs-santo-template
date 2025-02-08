import { RoleModel } from './RoleModel';

export class UserModel {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl?: string;
  readonly phoneNumber?: string;
  readonly isActive: boolean;
  readonly roles: RoleModel[] = [];

  constructor(data: Partial<UserModel>) {
    Object.assign(this, data);
  }

  hasRole(roleName: string): boolean {
    return this.roles.some((role) => role.name === roleName);
  }
}
