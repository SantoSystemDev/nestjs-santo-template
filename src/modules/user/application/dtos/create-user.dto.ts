import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ROLE_VALUES, RoleEnum } from '@user/domain/enums/role.enum';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'Password123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description:
      'The phone number of the user. It must follow the format: DDD + cellphone number, without spaces or special characters. Example: 11 91234-5678 = 11912345678',
    example: '11912345678',
  })
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'Phone number must be exactly 11 digits (DDD + cellphone number)',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'The roles assigned to the user',
    example: ROLE_VALUES,
    enum: RoleEnum,
    isArray: true,
  })
  @IsArray({ each: true })
  @ArrayUnique()
  roles: RoleEnum[];

  constructor(data: Partial<CreateUserDto>) {
    Object.assign(this, data);
  }
}
