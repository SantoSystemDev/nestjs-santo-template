import { Injectable } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '@shared/database';

@Injectable()
export class DatabaseHealthService {
  constructor(
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly databaseService: PrismaService,
  ) {}

  async check() {
    return await this.prismaHealthIndicator.pingCheck(
      'database',
      this.databaseService,
      {
        timeout: 500,
      },
    );
  }
}
