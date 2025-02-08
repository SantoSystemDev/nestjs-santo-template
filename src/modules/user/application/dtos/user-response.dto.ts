import { RoleEnum } from '@modules/user/domain/enums/role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the role',
    example: 'role-id',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the role',
    type: [String],
    enum: RoleEnum,
  })
  name: RoleEnum;

  @ApiPropertyOptional({
    description: 'The description of the role',
    example: 'Administrator with full access',
  })
  description?: string;

  constructor(data: Partial<RoleResponseDto>) {
    Object.assign(this, data);
  }
}

export class UserResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: 'user-id',
  })
  id: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  fullName: string;

  @ApiPropertyOptional({
    description: 'The avatar URL of the user',
    required: false,
    example: 'http://example.com/avatar.png',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description:
      'The phone number of the user. It must follow the format: DDD + cellphone number, without spaces or special characters. Example: 11 91234-5678 = 11912345678',
    example: '11912345678',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'The status of the user (active or not)',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The roles assigned to the user',
    type: [RoleResponseDto],
  })
  roles: RoleResponseDto[];

  constructor(data: Partial<UserResponseDto>) {
    Object.assign(this, data);
  }
}
