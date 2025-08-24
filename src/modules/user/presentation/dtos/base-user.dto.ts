import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class BaseUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description:
      'The phone number of the user. It must follow the format: DDD + cellphone number. Example: 11912345678',
    example: '11912345678',
  })
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'Phone number must be exactly 11 digits (DDD + cellphone number)',
  })
  phoneNumber?: string;

  constructor(data: Partial<BaseUserDto>) {
    Object.assign(this, data);
  }
}
