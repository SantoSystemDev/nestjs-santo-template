import { PrismaService } from '@infra/database';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers';
import {
  DiskHealthService,
  HealthService,
  MemoryHealthService,
  PrismaHealthService,
} from './services';

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
