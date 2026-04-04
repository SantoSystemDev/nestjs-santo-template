import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleDestroy,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { auth as authInstance } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bodyParser from 'body-parser';
import { AuthGuard } from './auth.guard';
import { AuthMiddleware } from './auth.middleware';
import { AuthService } from './auth.service';

interface BodyParserOptions {
  json?: { limit?: string };
  urlencoded?: { limit?: string; extended?: boolean };
}

interface AuthModuleOptions {
  auth: typeof authInstance;
  bodyParser?: BodyParserOptions;
}

@Module({})
export class AuthModule implements NestModule, OnModuleDestroy {
  private static bodyParserOptions?: BodyParserOptions;

  static forRoot(options: AuthModuleOptions): DynamicModule {
    AuthModule.bodyParserOptions = options.bodyParser;

    return {
      module: AuthModule,
      global: true,
      providers: [
        {
          provide: 'AUTH_INSTANCE',
          useValue: options.auth,
        },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        AuthService,
      ],
      exports: [AuthService, 'AUTH_INSTANCE'],
    };
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('/api/auth/*path');

    const opts = AuthModule.bodyParserOptions;
    if (opts) {
      const middlewares: any[] = [];

      if (opts.json) {
        middlewares.push(bodyParser.json(opts.json));
      }
      if (opts.urlencoded) {
        middlewares.push(bodyParser.urlencoded(opts.urlencoded));
      }

      if (middlewares.length) {
        consumer
          .apply(...middlewares)
          .exclude('/api/auth/*path')
          .forRoutes('*path');
      }
    }
  }
}
