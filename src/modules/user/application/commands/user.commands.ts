import { RoleEnum } from '@user/domain/enums/role.enum';

export class CreateUserCommand {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly phoneNumber?: string;
  readonly roles: RoleEnum[];
  readonly adminId: string;

  constructor(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    roles: RoleEnum[];
    adminId: string;
  }) {
    this.email = data.email;
    this.password = data.password;
    this.fullName = data.fullName;
    this.phoneNumber = data.phoneNumber;
    this.roles = data.roles;
    this.adminId = data.adminId;
  }
}

export class UpdateUserCommand {
  readonly id: string;
  readonly email?: string;
  readonly fullName?: string;
  readonly phoneNumber?: string;
  readonly isActive?: boolean;
  readonly loggedUserId: string;

  constructor(data: {
    id: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    isActive?: boolean;
    loggedUserId: string;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.fullName = data.fullName;
    this.phoneNumber = data.phoneNumber;
    this.isActive = data.isActive;
    this.loggedUserId = data.loggedUserId;
  }
}
