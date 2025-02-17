import { JwtPayloadModel } from '@auth/domain/models';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { UserRepositoryPort } from '@user/domain/ports';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: UserRepositoryPort) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
    });
  }

  async validate(payload: JwtPayloadModel): Promise<JwtPayloadModel> {
    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
    };
  }
}
