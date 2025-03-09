import { CreateUserDto, UserResponseDto } from '@user/application/dtos';

export abstract class CreateUserServicePort {
  /**
   * Create a new user.
   *
   * @param createUserDto User data.
   * @param adminId ID of the authenticated user who is creating the new user.
   * @returns The new user's details.
   * @throws UnauthorizedException if the user does not have the ADMIN role.
   * @throws ConflictException if the email is already in use.
   */
  abstract execute(
    createUserDto: CreateUserDto,
    adminId: string,
  ): Promise<UserResponseDto>;
}
