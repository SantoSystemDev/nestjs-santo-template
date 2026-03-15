import {
  DiskHealthIndicator,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

const mockHealthCheckService = { check: jest.fn() };
const mockDiskHealthIndicator = { checkStorage: jest.fn() };
const mockMemoryHealthIndicator = { checkHeap: jest.fn() };

describe('HealthController', () => {
  let controller: HealthController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: DiskHealthIndicator, useValue: mockDiskHealthIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result when all indicators are up', async () => {
    mockHealthCheckService.check.mockResolvedValue({
      status: 'ok',
      info: { memory_heap: { status: 'up' }, storage: { status: 'up' } },
      error: {},
      details: { memory_heap: { status: 'up' }, storage: { status: 'up' } },
    });

    const result = await controller.check();
    expect(result.status).toBe('ok');
  });

  it('should propagate error when a health indicator fails', async () => {
    mockHealthCheckService.check.mockRejectedValue(
      new Error('Health check failed'),
    );

    await expect(controller.check()).rejects.toThrow('Health check failed');
  });
});
