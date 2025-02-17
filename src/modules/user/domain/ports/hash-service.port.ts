export abstract class HashServicePort {
  /**
   * Hash a password using bcrypt.
   *
   * @param password - The password to hash.
   * @returns The hashed password.
   */
  abstract hash(password: string): string;

  /**
   * Compare a password with a hashed password.
   *
   * @param password - The password to compare.
   * @param hashedPassword - The hashed password to compare with.
   * @returns true if they match, false otherwise.
   */
  abstract compare(password: string, hashedPassword: string): boolean;
}
