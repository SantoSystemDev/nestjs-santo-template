/**
 * Domain error codes that can be used across all modules
 */
export enum DomainErrorCodes {
  // 400 - Bad Request
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 401 - Unauthorized
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',

  // 403 - Forbidden
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 404 - Not Found
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // 409 - Conflict
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // 422 - Unprocessable Entity
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
}
