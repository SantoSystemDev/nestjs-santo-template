import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { auth as authInstance } from '@/lib/auth';
import { toNodeHandler } from 'better-auth/node';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly handler: ReturnType<typeof toNodeHandler>;

  constructor(
    @Inject('AUTH_INSTANCE') private readonly auth: typeof authInstance,
  ) {
    this.handler = toNodeHandler(this.auth);
  }

  use(req: Request, res: Response, next: NextFunction) {
    try {
      this.handler(req, res);
    } catch (err) {
      next(err);
    }
  }
}
