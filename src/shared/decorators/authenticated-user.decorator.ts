import { JwtPayloadModel } from '@auth/domain/models';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthenticatedUser = createParamDecorator(
  (data: keyof JwtPayloadModel | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayloadModel = request.user;
    return data ? user?.[data] : user;
  },
);
