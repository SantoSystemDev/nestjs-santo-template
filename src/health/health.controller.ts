import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  @AllowAnonymous()
  @HealthCheck()
  @ApiOperation({
    summary: 'Verifica a saúde da aplicação',
    description: 'Checa os indicadores de banco de dados, memória e disco.',
  })
  @ApiOkResponse({
    description: 'Todos os indicadores de saúde estão operacionais.',
    schema: { example: { status: 'ok' } },
  })
  @ApiServiceUnavailableResponse({
    description: 'Um ou mais indicadores de saúde falharam.',
    schema: { example: { status: 'error' } },
  })
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          thresholdPercent: 0.9,
          path: process.platform === 'win32' ? 'C:\\' : '/',
        }),
    ]);
  }
}
