import { JwtPayloadModel } from '@auth/domain/models';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { HashServicePort, UserRepositoryPort } from '@user/domain/ports';
import { Strategy } from 'passport-local';

@Injectable()
export class PasswordStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(PasswordStrategy.name);

  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly hashService: HashServicePort,
  ) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<JwtPayloadModel> {
    this.logger.log('Attempting local authentication');

    const user = await this.userRepository.findByEmail(email);
    if (
      !user ||
      !user.isActive ||
      !this.hashService.compare(password, user.password)
    ) {
      this.logger.error('Local authentication failed');
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Local authentication successful - userId: ${user.id}`);
    return {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
    };
  }
}
