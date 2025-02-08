import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { HealthService } from '../../application/services';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Performs a health check to ensure the application is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'The application is healthy.',
  })
  @ApiResponse({
    status: 503,
    description: 'The application is not healthy.',
  })
  async check() {
    return this.healthService.check();
  }
}
