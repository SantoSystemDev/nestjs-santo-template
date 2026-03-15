import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  content: T[] = [];

  @ApiProperty({ example: 1 })
  currentPage = 1;

  @ApiProperty({ example: 20 })
  totalItemsPerPage = 20;

  @ApiProperty({ example: 100 })
  totalItems = 0;

  @ApiProperty({ example: 5 })
  totalPages = 0;
}
