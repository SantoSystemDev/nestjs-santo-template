import { HealthService } from '@health/application/services';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';

@Controller('/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
  @Get()
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  async check() {
    return await this.healthService.check();
  }
}
