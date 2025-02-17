import { SignupDto } from '@auth/application/dtos';
import { JwtPayloadModel } from '@auth/domain/models';

export abstract class AuthServicePort {
  /**
   * Registers a new user.
   *
   * @param signupDto - User information to be created.
   * @returns Object with the user's access token.
   * @throws ConflictException if email is already in use.
   */
  abstract signup(signupDto: SignupDto): Promise<{ accessToken: string }>;

  /**
   * Authenticates a user and returns an access token.
   *
   * @param payload - JWT payload containing user information.
   * @returns Object with the access token.
   * @throws UnauthorizedException if credentials are invalid.
   */
  abstract login(payload: JwtPayloadModel): Promise<{ accessToken: string }>;
}
