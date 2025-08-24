import { RoleEnum } from '../enums/role.enum';
import { UserModel } from '../models';
import {
  AdminNotFoundError,
  EmailAlreadyInUseError,
  InsufficientPermissionsError,
  InvalidEmailFormatError,
  RequiredFieldError,
  InvalidRoleError,
  EmptyRolesError,
} from '../errors';

export class UserDomainService {
  /**
   * Valida se um usuário tem permissão para criar outros usuários
   */
  static validateUserCreationPermission(adminUser: UserModel | null): void {
    if (!adminUser) {
      throw new AdminNotFoundError();
    }

    if (!adminUser.hasRole(RoleEnum.ADMIN)) {
      throw new InsufficientPermissionsError('create other users');
    }
  }

  /**
   * Valida se um email já está em uso
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
   * Valida dados básicos do usuário
   */
  static validateUserData(email: string, fullName: string): void {
    if (!email || !email.trim()) {
      throw new RequiredFieldError('Email');
    }

    if (!fullName || !fullName.trim()) {
      throw new RequiredFieldError('Full name');
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new InvalidEmailFormatError(email);
    }
  }

  /**
   * Valida roles do usuário
   */
  static validateUserRoles(roles: string[]): void {
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
