import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from '@shared/database';
import {
  DatabaseHealthService,
  DiskHealthService,
  HealthService,
  MemoryHealthService,
} from './application/services';
import { HealthController } from './presentation/controllers';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthService,
    DiskHealthService,
    MemoryHealthService,
    PrismaService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
