import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'ROLES';

/**
 * Checks ONLY user.role (system role, via admin plugin).
 * Never checks organization roles — intentional separation to
 * prevent privilege escalation (org admin ≠ system admin).
 */
export const Roles = (roles: string[]) => SetMetadata(ROLES_KEY, roles);
