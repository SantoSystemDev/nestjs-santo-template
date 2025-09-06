import { Provider } from '@nestjs/common';
import {
  CreateUserService,
  DeleteUserService,
  HashService,
  UpdateUserService,
} from '@user/application/services';
import { UserRepositoryPort } from '@user/domain/ports';
import { UserRepository } from '@user/infra/adapters/repositories';

export const UserProviders: Provider[] = [
  { provide: UserRepositoryPort, useClass: UserRepository },
  CreateUserService,
  UpdateUserService,
  DeleteUserService,
  HashService,
];
