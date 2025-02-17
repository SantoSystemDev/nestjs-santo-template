import { Injectable } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '@shared/database';

@Injectable()
export class PrismaHealthService {
  constructor(
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  async check() {
    return await this.prismaHealthIndicator.pingCheck(
      'database',
      this.prismaService,
      {
        timeout: 500,
      },
    );
  }
}
