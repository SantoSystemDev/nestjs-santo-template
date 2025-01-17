import { PrismaService } from '@infra/database';
import { Injectable } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class PrismaHealthService {
  constructor(
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  async check() {
    return this.prismaHealthIndicator.pingCheck(
      'database',
      this.prismaService,
      {
        timeout: 500,
      },
    );
  }
}
