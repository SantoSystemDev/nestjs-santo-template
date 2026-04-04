import { Inject, Injectable } from '@nestjs/common';
import type { auth as authInstance } from '@/lib/auth';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_INSTANCE') private readonly auth: typeof authInstance,
  ) {}

  get api() {
    return this.auth.api;
  }

  get instance() {
    return this.auth;
  }
}
