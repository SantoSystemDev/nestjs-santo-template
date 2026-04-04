/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('@/lib/auth', () => ({}));
jest.mock('better-auth/node', () => ({
  toNodeHandler: jest.fn(() => jest.fn()),
}));

import { toNodeHandler } from 'better-auth/node';
import { AuthMiddleware } from './auth.middleware';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let mockHandler: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    mockHandler = jest.fn();
    (toNodeHandler as jest.Mock).mockReturnValue(mockHandler);
    mockAuth = { api: {} };
    middleware = new AuthMiddleware(mockAuth);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should create handler with auth instance', () => {
    expect(toNodeHandler).toHaveBeenCalledWith(mockAuth);
  });

  it('should delegate request to better-auth handler', () => {
    const req = { url: '/api/auth/sign-in' } as any;
    const res = {} as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockHandler).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });
});
