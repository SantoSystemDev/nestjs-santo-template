import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { BaseUserDto } from './base-user.dto';

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

export class UserResponseDto extends BaseUserDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: 'user-id',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'The avatar URL of the user',
    required: false,
    example: 'http://example.com/avatar.png',
  })
  avatarUrl?: string;

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
    super(data);
    Object.assign(this, data);
  }
}
