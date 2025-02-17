import { CreateUserDto, UserResponseDto } from '@user/application/dtos';

export abstract class CreateUserServicePort {
  /**
   * Creates a new user with roles (only accessible by admins).
   *
   * @param createUserDto - User's data.
   * @param adminId - ID of the admin creating the user.
   * @returns The created user's details.
   */
  abstract execute(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto>;
}
