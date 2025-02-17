import { RoleEnum } from '@user/domain/enums/role.enum';

export class JwtPayloadModel {
  userId: string;
  email: string;
  roles: RoleEnum[];
}
