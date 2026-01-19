import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '@shared/decorators';

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @NormalizeEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
