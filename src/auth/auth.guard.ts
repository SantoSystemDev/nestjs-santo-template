/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { auth as authInstance } from '@/lib/auth';
import { Request } from 'express';
import { ALLOW_ANONYMOUS_KEY } from './decorators/allow-anonymous.decorator';
import { OPTIONAL_AUTH_KEY } from './decorators/optional-auth.decorator';
import { ORG_ROLES_KEY } from './decorators/org-roles.decorator';
import { ROLES_KEY } from './decorators/roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('AUTH_INSTANCE')
    private readonly auth: typeof authInstance,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const session = await this.auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (session) {
      (request as any).session = session;
      (request as any).user = session.user;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptional) {
      return true;
    }

    if (!session) {
      throw new UnauthorizedException();
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles?.length) {
      const userRole = (session.user as any).role;
      if (!userRole || !requiredRoles.includes(userRole)) {
        throw new ForbiddenException(
          'Insufficient role to access this resource',
        );
      }
    }

    const requiredOrgRoles = this.reflector.getAllAndOverride<string[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredOrgRoles?.length) {
      const activeOrgId = (session as any).session?.activeOrganizationId;
      if (!activeOrgId) {
        throw new ForbiddenException('No active organization');
      }

      let member: any;
      try {
        member = await this.auth.api.getFullOrganization({
          headers: request.headers as unknown as Headers,
        });
      } catch {
        throw new ForbiddenException(
          'Unable to verify organization membership',
        );
      }

      const memberRole = member?.members?.find(
        (m: any) => m.userId === session.user.id,
      )?.role;

      if (!memberRole || !requiredOrgRoles.includes(memberRole)) {
        throw new ForbiddenException(
          'Insufficient organization role to access this resource',
        );
      }
    }

    return true;
  }
}
