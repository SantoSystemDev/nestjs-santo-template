/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
jest.mock('@/lib/auth', () => ({}));

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

function createMockExecutionContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;
  let mockAuth: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockAuth = {
      api: {
        getSession: jest.fn(),
        getFullOrganization: jest.fn(),
      },
    };
    guard = new AuthGuard(reflector, mockAuth);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('AllowAnonymous', () => {
    it('should allow access when @AllowAnonymous is set', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
      const context = createMockExecutionContext({ headers: {} });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuth.api.getSession).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated routes', () => {
    it('should throw UnauthorizedException when no session exists', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      mockAuth.api.getSession.mockResolvedValue(null);
      const context = createMockExecutionContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow access and attach session to request when authenticated', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const session = {
        user: { id: '1', email: 'test@test.com' },
        session: { id: 'sess-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      const request: any = { headers: {} };
      const context = createMockExecutionContext(request);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.session).toBe(session);
      expect(request.user).toBe(session.user);
    });
  });

  describe('OptionalAuth', () => {
    it('should allow access without session when @OptionalAuth is set', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(true); // OPTIONAL_AUTH_KEY
      mockAuth.api.getSession.mockResolvedValue(null);
      const context = createMockExecutionContext({ headers: {} });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should attach session when available with @OptionalAuth', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(true); // OPTIONAL_AUTH_KEY
      const session = {
        user: { id: '1', email: 'test@test.com' },
        session: { id: 'sess-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      const request: any = { headers: {} };
      const context = createMockExecutionContext(request);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.session).toBe(session);
    });
  });

  describe('Roles', () => {
    it('should allow access when user has required role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(undefined) // OPTIONAL_AUTH_KEY
        .mockReturnValueOnce(['admin']) // ROLES_KEY
        .mockReturnValueOnce(undefined); // ORG_ROLES_KEY
      const session = {
        user: { id: '1', role: 'admin' },
        session: { id: 'sess-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      const context = createMockExecutionContext({ headers: {} });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(undefined) // OPTIONAL_AUTH_KEY
        .mockReturnValueOnce(['admin']); // ROLES_KEY
      const session = {
        user: { id: '1', role: 'user' },
        session: { id: 'sess-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      const context = createMockExecutionContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user has no role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(undefined) // OPTIONAL_AUTH_KEY
        .mockReturnValueOnce(['admin']); // ROLES_KEY
      const session = {
        user: { id: '1' },
        session: { id: 'sess-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      const context = createMockExecutionContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('OrgRoles', () => {
    it('should throw ForbiddenException when no active organization', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(undefined) // OPTIONAL_AUTH_KEY
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(['owner']); // ORG_ROLES_KEY
      const session = {
        user: { id: '1' },
        session: { id: 'sess-1', activeOrganizationId: null },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      const context = createMockExecutionContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when user has required org role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(undefined) // OPTIONAL_AUTH_KEY
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(['owner']); // ORG_ROLES_KEY
      const session = {
        user: { id: '1' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      mockAuth.api.getFullOrganization.mockResolvedValue({
        members: [{ userId: '1', role: 'owner' }],
      });
      const context = createMockExecutionContext({ headers: {} });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required org role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // ALLOW_ANONYMOUS_KEY
        .mockReturnValueOnce(undefined) // OPTIONAL_AUTH_KEY
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(['owner']); // ORG_ROLES_KEY
      const session = {
        user: { id: '1' },
        session: { id: 'sess-1', activeOrganizationId: 'org-1' },
      };
      mockAuth.api.getSession.mockResolvedValue(session);
      mockAuth.api.getFullOrganization.mockResolvedValue({
        members: [{ userId: '1', role: 'member' }],
      });
      const context = createMockExecutionContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
