import { DomainError } from '@shared/errors/domain-error';
import { DomainErrorCodes } from '@shared/errors/domain-error-codes.enum';

export class InvalidEmailFormatError extends DomainError {
  readonly code = DomainErrorCodes.VALIDATION_ERROR;

  constructor(email: string) {
    super(`Invalid email format: '${email}'`);
  }
}

export class RequiredFieldError extends DomainError {
  readonly code = DomainErrorCodes.VALIDATION_ERROR;

  constructor(field: string) {
    super(`${field} is required`);
  }
}

export class EmptyRolesError extends DomainError {
  readonly code = DomainErrorCodes.VALIDATION_ERROR;

  constructor() {
    super('User must have at least one role');
  }
}

export class InvalidRoleError extends DomainError {
  readonly code = DomainErrorCodes.VALIDATION_ERROR;

  constructor(invalidRoles: string) {
    super(`Invalid roles: ${invalidRoles}`);
  }
}

export class AdminNotFoundError extends DomainError {
  readonly code = DomainErrorCodes.AUTHENTICATION_REQUIRED;

  constructor() {
    super('Admin user not found');
  }
}

export class InsufficientPermissionsError extends DomainError {
  readonly code = DomainErrorCodes.INSUFFICIENT_PERMISSIONS;

  constructor(action: string) {
    super(`Insufficient permissions to ${action}`);
  }
}

export class EmailAlreadyInUseError extends DomainError {
  readonly code = DomainErrorCodes.RESOURCE_ALREADY_EXISTS;

  constructor(email: string) {
    super(`Email '${email}' is already in use`);
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = DomainErrorCodes.RESOURCE_NOT_FOUND;

  constructor(identifier?: string) {
    super(identifier ? `User '${identifier}' not found` : 'User not found');
  }
}
