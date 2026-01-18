import { TokenTypeEnum } from '../enums/token-type.enum';

export class EmailVerificationPayload {
  userId: string;
  type: TokenTypeEnum.EMAIL_VERIFICATION;
}
