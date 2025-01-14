import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleEnum } from '../enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'Password123!',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'The roles assigned to the user',
    example: ['USER'],
    enum: RoleEnum,
    isArray: true,
  })
  @IsArray({ each: true })
  @ArrayNotEmpty()
  roles: RoleEnum[];

  @ApiProperty({
    description: 'The avatar URL of the user',
    required: false,
    example: 'http://example.com/avatar.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    description:
      'The phone number of the user. It must follow the format: DDI + DDD + cellphone number, without spaces or special characters. Example: +55 11 91234-5678 = 5511912345678',
    required: false,
    example: '5511912345678',
  })
  @IsOptional()
  @IsNumberString()
  @MinLength(13)
  phoneNumber?: string;

  constructor(data: {
    email: string;
    password: string;
    fullName: string;
    roles: RoleEnum[];
    avatarUrl?: string;
    phoneNumber?: string;
  }) {
    Object.assign(this, data);
  }
}
