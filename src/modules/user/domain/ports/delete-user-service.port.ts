export abstract class DeleteUserServicePort {
  /**
   * Delete a user by ID.
   *
   * @param id The user ID.
   * @param adminId The admin ID.
   */
  abstract execute(id: string, adminId: string): Promise<void>;
}
