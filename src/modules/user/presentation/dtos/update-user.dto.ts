import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { BaseUserDto } from './base-user.dto';

export class UpdateUserDto extends PartialType(BaseUserDto) {
  @ApiProperty({
    description: 'The status of the user (active or not)',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;

  constructor(data: Partial<UpdateUserDto>) {
    super(data);
  }
}
