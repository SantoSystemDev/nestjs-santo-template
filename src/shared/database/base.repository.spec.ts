import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@shared/database';
import { BaseRepository } from '@shared/database/base.repository';
import { Injectable } from '@nestjs/common';

// Mock repository para teste
@Injectable()
class TestRepository extends BaseRepository {
  async testQuery<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeQuery(operation);
  }

  async testTransaction<T>(
    callback: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.executeTransaction(callback);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestRepository,
        {
          provide: PrismaService,
          useValue: {
            handleDatabaseError: jest.fn(),
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TestRepository>(TestRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('executeQuery', () => {
    it('should execute operation successfully', async () => {
      const mockResult = { id: '1', name: 'test' };
      const operation = jest.fn().mockResolvedValue(mockResult);

      const result = await repository.testQuery(operation);

      expect(result).toBe(mockResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      const handledException = new Error('Handled error');
      const operation = jest.fn().mockRejectedValue(mockError);

      jest
        .spyOn(prismaService, 'handleDatabaseError')
        .mockImplementation(() => {
          throw handledException;
        });

      await expect(repository.testQuery(operation)).rejects.toThrow(
        handledException,
      );
      expect(prismaService.handleDatabaseError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockResult = { id: '1', name: 'test' };
      const callback = jest.fn().mockResolvedValue(mockResult);

      jest.spyOn(prismaService, '$transaction').mockResolvedValue(mockResult);

      const result = await repository.testTransaction(callback);

      expect(result).toBe(mockResult);
      expect(prismaService.$transaction).toHaveBeenCalledWith(callback);
    });

    it('should handle transaction errors', async () => {
      const mockError = new Error('Transaction error');
      const handledException = new Error('Handled error');
      const callback = jest.fn();

      jest.spyOn(prismaService, '$transaction').mockRejectedValue(mockError);
      jest
        .spyOn(prismaService, 'handleDatabaseError')
        .mockImplementation(() => {
          throw handledException;
        });

      await expect(repository.testTransaction(callback)).rejects.toThrow(
        handledException,
      );
      expect(prismaService.handleDatabaseError).toHaveBeenCalledWith(mockError);
    });
  });
});
