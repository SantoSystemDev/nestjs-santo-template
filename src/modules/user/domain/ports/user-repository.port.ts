import { UserModel } from '@modules/user/domain/models';

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
   */
  abstract createUser(user: UserModel): Promise<UserModel>;

  /**
   * Update an existent user.
   *
   * @param user - UserModel with updated data
   * @returns The updated user
   */
  abstract update(user: UserModel): Promise<UserModel>;

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
