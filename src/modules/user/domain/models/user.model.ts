import { normalizeUserData } from '@user/application/utils/user-data.utils';
import { arrayNotEmpty, isEmail, isEmpty, isIn } from 'class-validator';
import { ROLE_VALUES, RoleEnum } from '../enums/role.enum';
import {
  AdminNotFoundError,
  EmptyRolesError,
  InsufficientPermissionsError,
  InvalidEmailFormatError,
  InvalidRoleError,
  RequiredFieldError,
} from '../errors';
import { RoleModel } from './role.model';

export class UserModel {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly avatarUrl?: string;
  readonly phoneNumber?: string;
  readonly isActive: boolean;
  readonly emailVerified: boolean;
  readonly organizationId?: string;
  readonly loginAttempts: number;
  readonly isLocked: boolean;
  readonly lockedUntil?: Date | null;
  readonly roles?: RoleModel[] = [];
  readonly refreshTokens?: string[] = [];

  constructor(data: Partial<UserModel>) {
    Object.assign(this, data);
  }

  /**
   * Verifica se o usuário possui um papel específico
   */
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
    fullName: string;
    email: string;
    passwordHash: string;
    roles: string[];
    phoneNumber?: string;
    avatarUrl?: string;
    organizationId?: string;
  }): UserModel {
    // Validar dados básicos
    this.validateFullName(data.fullName);
    this.validateEmail(data.email);
    this.validateRoles(data.roles);

    return new UserModel({
      ...data,
      ...normalizeUserData(data),
      isActive: true,
      emailVerified: false,
      loginAttempts: 0,
      isLocked: false,
      roles: data.roles.map(
        (role) => new RoleModel({ name: role as RoleEnum }),
      ),
    });
  }

  /**
   * Valida se possui permissões de admin
   */
  static validateAdminCanCreateUsers(adminUser: UserModel): void {
    if (!adminUser) {
      throw new AdminNotFoundError();
    }
    adminUser.validateCanCreateUsers();
  }

  /**
   * Valida formato do email
   */
  private static validateEmail(email: string): void {
    if (isEmpty(email)) {
      throw new RequiredFieldError('Email');
    }

    if (!isEmail(email)) {
      throw new InvalidEmailFormatError(email);
    }
  }

  /**
   * Valida nome completo
   */
  private static validateFullName(fullName: string): void {
    if (isEmpty(fullName)) {
      throw new RequiredFieldError('Full name');
    }

    if (fullName.length < 3) {
      throw new RequiredFieldError(
        'Full name must be at least 3 characters long',
      );
    }
  }

  /**
   * Valida roles do usuário
   */
  private static validateRoles(roles: string[]): void {
    // Valida se roles é um array válido e não vazio
    if (!arrayNotEmpty(roles)) {
      throw new EmptyRolesError();
    }

    // Encontra roles inválidos e lança erro se existirem
    const invalidRoles = roles.filter((role) => !isIn(role, ROLE_VALUES));
    if (invalidRoles.length > 0) {
      throw new InvalidRoleError(invalidRoles.join(', '));
    }
  }
}
