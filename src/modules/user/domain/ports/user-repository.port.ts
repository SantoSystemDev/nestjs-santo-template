import { CreateUserDto } from '@user/application/dtos';
import { UserModel } from '../models';

export abstract class UserRepositoryPort {
  /**
   * Finds a user by its email.
   *
   * @param email Email of the user
   * @returns The user if found, null otherwise
   */
  abstract findByEmail(email: string): Promise<UserModel | null>;

  /**
   * Finds a user by its unique identifier.
   *
   * @param userId Unique identifier of the user
   * @returns The user if found, null otherwise
   */
  abstract findById(userId: string): Promise<UserModel | null>;

  /**
   * Creates a new user in the database.
   *
   * @param createUserDto Data to create the user
   * @param hashedPassword Hashed password to store in the database
   * @returns The created user
   */
  abstract createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserModel>;
}
