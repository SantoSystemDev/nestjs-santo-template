import { Provider } from '@nestjs/common';
import {
  CreateUserService,
  HashService,
  UpdateUserService,
  DeleteUserService,
} from '@user/application/services';
import { HashServicePort, UserRepositoryPort } from '@user/domain/ports';
import { UserRepository } from '@user/infrastructure/adapters/repositories';

export const UserProviders: Provider[] = [
  { provide: UserRepositoryPort, useClass: UserRepository },
  CreateUserService,
  UpdateUserService,
  DeleteUserService,
  { provide: HashServicePort, useClass: HashService },
];
