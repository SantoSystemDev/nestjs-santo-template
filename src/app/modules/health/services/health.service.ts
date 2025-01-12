import { Injectable } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { DiskHealthService } from './disk-health.service';
import { MemoryHealthService } from './memory-health.service';
import { PrismaHealthService } from './prisma-health.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaHealthService: PrismaHealthService,
    private readonly diskHealthService: DiskHealthService,
    private readonly memoryHealthService: MemoryHealthService,
  ) {}

  async check() {
    return this.healthCheckService.check([
      // Check Prisma
      async () => this.prismaHealthService.check(),
      // Check Disk
      async () => this.diskHealthService.check(),
      // Check Memory
      async () => this.memoryHealthService.check(),
    ]);
  }
}
