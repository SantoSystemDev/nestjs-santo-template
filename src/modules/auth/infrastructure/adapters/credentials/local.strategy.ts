import { JwtPayloadModel } from '@auth/domain/models';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { HashServicePort, UserRepositoryPort } from '@user/domain/ports';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly hashService: HashServicePort,
  ) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<JwtPayloadModel> {
    const user = await this.userRepository.findByEmail(email);

    if (
      !user ||
      !user.isActive ||
      !this.hashService.compare(password, user.password)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
    };
  }
}
