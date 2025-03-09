import { UpdateUserDto, UserResponseDto } from '@user/application/dtos';

export abstract class UpdateUserServicePort {
  /**
   * Update an existent user.
   *
   * @param id ID of the user to be updated.
   * @param updateUserDto New user data.
   * @returns The updated user's details.
   * @throws ConflictException if the email is already in use.
   * @throws NotFoundException if the user with the given ID does not exist.
   */
  abstract execute(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto>;
}
