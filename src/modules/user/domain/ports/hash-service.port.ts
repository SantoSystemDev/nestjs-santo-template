export abstract class HashServicePort {
  /**
   * Hash a given password using bcrypt.
   *
   * @param password The password to hash.
   * @returns {string} The hashed password.
   */
  abstract hash(password: string): string;

  /**
   * Compare a given password with a hashed password.
   *
   * @param password The password to compare.
   * @param hashedPassword The hashed password to compare with.
   * @returns {boolean} true if the password matches the hashed password, false if not.
   */
  abstract compare(password: string, hashedPassword: string): boolean;
}
