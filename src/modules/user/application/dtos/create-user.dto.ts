import { RoleEnum } from '@modules/user/domain/enums/role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'The avatar URL of the user',
    example: 'http://example.com/avatar.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description:
      'The phone number of the user. It must follow the format: DDD + cellphone number, without spaces or special characters. Example: 11 91234-5678 = 11912345678',
    example: '11912345678',
  })
  @IsOptional()
  @IsNumberString()
  @MinLength(11)
  @IsPhoneNumber('BR')
  phoneNumber?: string;

  @ApiProperty({
    description: 'The roles assigned to the user',
    example: ['USER'],
    enum: RoleEnum,
    isArray: true,
  })
  @IsArray({ each: true })
  @ArrayNotEmpty()
  roles: RoleEnum[];

  constructor(data: Partial<CreateUserDto>) {
    Object.assign(this, data);
  }
}
