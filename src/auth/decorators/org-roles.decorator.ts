import { SetMetadata } from '@nestjs/common';

export const ORG_ROLES_KEY = 'ORG_ROLES';

/**
 * Checks member role in the active organization (session.activeOrganizationId).
 * Requires the user to have an active organization, otherwise returns 403.
 */
export const OrgRoles = (roles: string[]) => SetMetadata(ORG_ROLES_KEY, roles);
