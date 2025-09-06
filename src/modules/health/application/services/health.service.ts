import { Injectable } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { DatabaseHealthService } from './database-health.service';
import { DiskHealthService } from './disk-health.service';
import { MemoryHealthService } from './memory-health.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly databaseHealthCheckService: DatabaseHealthService,
    private readonly diskHealthService: DiskHealthService,
    private readonly memoryHealthService: MemoryHealthService,
  ) {}

  async check() {
    return await this.healthCheckService.check([
      // Check Database
      async () => this.databaseHealthCheckService.check(),
      // Check Disk
      async () => this.diskHealthService.check(),
      // Check Memory
      async () => this.memoryHealthService.check(),
    ]);
  }
}
