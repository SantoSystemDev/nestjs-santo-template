/* eslint-disable @typescript-eslint/no-unsafe-member-access */
jest.mock('@/lib/auth', () => ({}));

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuth: any;

  beforeEach(() => {
    mockAuth = {
      api: {
        getSession: jest.fn(),
        signUpEmail: jest.fn(),
      },
    };
    service = new AuthService(mockAuth);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose the auth api', () => {
    expect(service.api).toBe(mockAuth.api);
  });

  it('should expose the auth instance', () => {
    expect(service.instance).toBe(mockAuth);
  });
});
