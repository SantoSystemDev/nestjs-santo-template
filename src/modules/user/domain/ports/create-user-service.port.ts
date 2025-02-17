import { CreateUserDto, UserResponseDto } from '@user/application/dtos';

export abstract class CreateUserServicePort {
  /**
   * Registers a new user with roles.
   * Only admins can perform this action.
   *
   * @param createUserDto User's data
   * @param adminId ID of the authenticated user trying to create a new user
   * @returns Response for the created user
   */
  abstract execute(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto>;
}
