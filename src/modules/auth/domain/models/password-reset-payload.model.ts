import { TokenTypeEnum } from '../enums/token-type.enum';

export class PasswordResetPayload {
  userId: string;
  type: TokenTypeEnum.PASSWORD_RESET;
}
