import { IsEmail, IsNotEmpty } from 'class-validator';
import { NormalizeEmail } from '@shared/decorators';

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @NormalizeEmail()
  email: string;
}
