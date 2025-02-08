// src/modules/user/infrastructure/providers/user.providers.ts
import {
  CreateUserService,
  HashService,
} from '@modules/user/application/services';
import {
  CreateUserServicePort,
  HashServicePort,
  UserRepositoryPort,
} from '@modules/user/domain/ports';
import { UserRepository } from '@modules/user/infrastructure/adapters/repositories';
import { Provider } from '@nestjs/common';
import { PrismaService } from '@shared/database';

export const UserProviders: Provider[] = [
  PrismaService,
  { provide: UserRepositoryPort, useClass: UserRepository },
  { provide: CreateUserServicePort, useClass: CreateUserService },
  { provide: HashServicePort, useClass: HashService },
];
