import { Provider } from '@nestjs/common';
import { CreateUserService, HashService } from '@user/application/services';
import {
  CreateUserServicePort,
  HashServicePort,
  UserRepositoryPort,
} from '@user/domain/ports';
import { UserRepository } from '@user/infrastructure/adapters/repositories';

export const UserProviders: Provider[] = [
  { provide: UserRepositoryPort, useClass: UserRepository },
  { provide: CreateUserServicePort, useClass: CreateUserService },
  { provide: HashServicePort, useClass: HashService },
];
