import { ApiProperty } from '@nestjs/swagger';
import { ROLE_VALUES, RoleEnum } from '@user/domain/enums/role.enum';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { BaseUserDto } from './base-user.dto';

export class CreateUserDto extends BaseUserDto {
  @ApiProperty({
    description: 'The password of the user',
    example: 'Password123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

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
    super(data);
  }
}
