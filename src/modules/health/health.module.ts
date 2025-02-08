import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from '@shared/database';
import {
  DiskHealthService,
  HealthService,
  MemoryHealthService,
  PrismaHealthService,
} from './application/services';
import { HealthController } from './presentation/controllers';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaHealthService,
    DiskHealthService,
    MemoryHealthService,
    PrismaService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
