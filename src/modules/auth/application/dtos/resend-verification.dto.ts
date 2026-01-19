import { IsEmail, IsNotEmpty } from 'class-validator';
import { NormalizeEmail } from '@shared/decorators';

export class ResendVerificationDto {
  @IsNotEmpty()
  @IsEmail()
  @NormalizeEmail()
  email: string;
}
