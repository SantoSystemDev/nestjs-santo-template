import { UserModel } from '@modules/user/domain/models';
import { CreateUserDto, UpdateUserDto } from '@user/application/dtos';

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
   * @param createUserDto - New user data
   * @param hashedPassword - User's hashed password
   * @returns The created user
   */
  abstract createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserModel>;

  /**
   * Update an existent user.
   *
   * @param user - User data
   * @returns The updated user
   */
  abstract update(user: UpdateUserDto & { id: string }): Promise<UserModel>;

  /**
   * Delete a user by ID.
   *
   * @param userId - User's unique ID
   */
  abstract delete(userId: string): Promise<void>;

  /**
   * Find a user by email that does not have the given ID.
   *
   * @param email - User's email
   * @param excludeUserId - User ID to exclude from search
   * @returns The user or null if not found
   */
  abstract findByEmailAndNotId(
    email: string,
    excludeUserId: string,
  ): Promise<UserModel | null>;
}
