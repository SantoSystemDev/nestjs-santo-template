import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 20;

  @ApiPropertyOptional({
    example: 'createdAt',
    description:
      'Campo(s) para ordenação. Múltiplos: orderBy=name&orderBy=createdAt',
    type: String,
    isArray: true,
  })
  @IsOptional()
  @IsString({ each: true })
  orderBy?: string | string[];

  @ApiPropertyOptional({
    enum: SortDirection,
    enumName: 'SortDirection',
    default: SortDirection.ASC,
    isArray: true,
    description:
      'Direção(ões) pareadas com orderBy. Múltiplas: direction=asc&direction=desc',
  })
  @IsOptional()
  @IsEnum(SortDirection, { each: true })
  direction?: SortDirection | SortDirection[];
}
