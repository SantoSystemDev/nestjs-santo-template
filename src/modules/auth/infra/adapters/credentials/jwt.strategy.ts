import { JwtPayloadModel } from '@auth/domain/models';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { UserRepositoryPort } from '@user/domain/ports';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly userRepository: UserRepositoryPort) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
    });
  }

  async validate(payload: JwtPayloadModel): Promise<JwtPayloadModel> {
    this.logger.log(`Validating JWT for userId: ${payload.userId}`);

    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      this.logger.error(`JWT validation failed - userId: ${payload.userId}`);
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.log(`JWT validated successfully - userId: ${payload.userId}`);
    return {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name as RoleEnum),
    };
  }
}
