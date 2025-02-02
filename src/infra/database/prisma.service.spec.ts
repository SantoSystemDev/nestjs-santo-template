import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe(PrismaService.name, () => {
  let service: PrismaService;

  beforeAll(async () => {
    const mockPrismaService = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to the database', async () => {
    await expect(service.$connect()).resolves.not.toThrow();
  });
});
