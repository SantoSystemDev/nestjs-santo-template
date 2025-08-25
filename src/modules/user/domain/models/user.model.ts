import { RoleEnum } from '../enums/role.enum';
import {
  AdminNotFoundError,
  EmailAlreadyInUseError,
  EmptyRolesError,
  InsufficientPermissionsError,
  InvalidEmailFormatError,
  InvalidRoleError,
  RequiredFieldError,
} from '../errors';
import { RoleModel } from './role.model';

export class UserModel {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly avatarUrl?: string;
  readonly phoneNumber?: string;
  readonly isActive: boolean;
  readonly roles?: RoleModel[] = [];

  constructor(data: Partial<UserModel>) {
    Object.assign(this, data);
  }

  hasRole(roleName: string): boolean {
    return this.roles?.some((role) => role.name === roleName);
  }

  /**
   * Valida se este usuário tem permissão para criar outros usuários
   */
  validateCanCreateUsers(): void {
    if (!this.hasRole(RoleEnum.ADMIN)) {
      throw new InsufficientPermissionsError('create other users');
    }
  }

  /**
   * Factory method para criar um novo usuário com validações
   */
  static create(data: {
    email: string;
    password: string;
    fullName: string;
    roles: string[];
    phoneNumber?: string;
    avatarUrl?: string;
  }): UserModel {
    // Validar dados básicos
    this.validateEmail(data.email);
    this.validateFullName(data.fullName);
    this.validateRoles(data.roles);

    return new UserModel({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      fullName: data.fullName.trim(),
      phoneNumber: data.phoneNumber?.trim(),
      avatarUrl: data.avatarUrl?.trim(),
      isActive: true,
      roles: data.roles.map(
        (role) => new RoleModel({ name: role as RoleEnum }),
      ),
    });
  }

  /**
   * Valida se um admin existe e tem permissões
   */
  static validateAdminPermissions(adminUser: UserModel | null): void {
    if (!adminUser) {
      throw new AdminNotFoundError();
    }

    adminUser.validateCanCreateUsers();
  }

  /**
   * Valida se email está disponível
   */
  static validateEmailAvailability(
    existingUser: UserModel | null,
    email: string,
  ): void {
    if (existingUser) {
      throw new EmailAlreadyInUseError(email);
    }
  }

  /**
   * Valida formato do email
   */
  private static validateEmail(email: string): void {
    if (!email || !email.trim()) {
      throw new RequiredFieldError('Email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new InvalidEmailFormatError(email);
    }
  }

  /**
   * Valida nome completo
   */
  private static validateFullName(fullName: string): void {
    if (!fullName || !fullName.trim()) {
      throw new RequiredFieldError('Full name');
    }
  }

  /**
   * Valida roles do usuário
   */
  private static validateRoles(roles: string[]): void {
    if (!roles || roles.length === 0) {
      throw new EmptyRolesError();
    }

    const validRoles = Object.values(RoleEnum) as string[];
    const invalidRoles = roles.filter((role) => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      throw new InvalidRoleError(invalidRoles.join(', '));
    }
  }
}
