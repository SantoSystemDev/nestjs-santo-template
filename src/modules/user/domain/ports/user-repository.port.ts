import { CreateUserDto } from '@user/application/dtos';
import { UserModel } from '../models';

export abstract class UserRepositoryPort {
  /**
   * Find a user by email.
   *
   * @param email - User's email
   * @returns The user or null if not found
   */
  abstract findByEmail(email: string): Promise<UserModel | null>;

  /**
   * Find a user by ID.
   *
   * @param userId - User's unique ID
   * @returns The user or null if not found
   */
  abstract findById(userId: string): Promise<UserModel | null>;

  /**
   * Create a new user.
   *
   * @param createUserDto - User data
   * @param hashedPassword - User's hashed password
   * @returns The created user
   */
  abstract createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserModel>;
}
