import { RoleEnum } from '@user/domain/enums/role.enum';
import { UserModel } from '@user/domain/models';

export abstract class UserRepositoryPort {
  abstract findByEmail(email: string): Promise<UserModel | null>;
  abstract findById(userId: string): Promise<UserModel | null>;
  abstract create(user: UserModel): Promise<UserModel>;
  abstract update(user: UserModel): Promise<UserModel>;
  abstract delete(userId: string): Promise<void>;
  abstract findRoles(userId: string): Promise<RoleEnum[]>;
  abstract findByEmailAndNotId(
    email: string,
    excludeUserId: string,
  ): Promise<UserModel | null>;
}
