import { SignupDto } from '@auth/application/dtos';
import { JwtPayloadModel } from '@auth/domain/models';

export abstract class AuthServicePort {
  /**
   * Signup a new user with the given information.
   *
   * @param signupDto Information about the user to be created
   * @returns A promise that resolves to an object containing an access token for the new user
   * @throws ConflictException if the email is already in use
   */
  abstract signup(signupDto: SignupDto): Promise<{ accessToken: string }>;

  /**
   * Login with the given credentials.
   *
   * @param loginDto - The login data transfer object containing user's email and password
   * @returns A promise that resolves to an object containing an access token for the authenticated user
   * @throws UnauthorizedException if the credentials are invalid
   */
  abstract login(payload: JwtPayloadModel): Promise<{ accessToken: string }>;
}
