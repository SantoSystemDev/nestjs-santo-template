import { CreateUserDto } from '@modules/user/application/dtos';
import { UserModel } from '../models';

export abstract class UserRepositoryPort {
  abstract findByEmail(email: string): Promise<UserModel | null>;
  abstract findByIdWithRoles(userId: string): Promise<UserModel | null>;
  abstract createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserModel>;
}
