import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@shared/database';
import { BaseRepository } from '@shared/database/base.repository';

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
  let databaseService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      handleDatabaseError: jest.fn(),
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get(TestRepository);
    databaseService = module.get(PrismaService);
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
    expect(databaseService).toBeDefined();
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
        .spyOn(databaseService, 'handleDatabaseError')
        .mockImplementation(() => {
          throw handledException;
        });

      await expect(repository.testQuery(operation)).rejects.toThrow(
        handledException,
      );
      expect(databaseService.handleDatabaseError).toHaveBeenCalledWith(
        mockError,
      );
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockResult = { id: '1', name: 'test' };
      const callback = jest.fn().mockResolvedValue(mockResult);

      jest.spyOn(databaseService, '$transaction').mockResolvedValue(mockResult);

      const result = await repository.testTransaction(callback);

      expect(result).toBe(mockResult);
      expect(databaseService.$transaction).toHaveBeenCalledWith(callback);
    });

    it('should handle transaction errors', async () => {
      const mockError = new Error('Transaction error');
      const handledException = new Error('Handled error');
      const callback = jest.fn();

      jest.spyOn(databaseService, '$transaction').mockRejectedValue(mockError);
      jest
        .spyOn(databaseService, 'handleDatabaseError')
        .mockImplementation(() => {
          throw handledException;
        });

      await expect(repository.testTransaction(callback)).rejects.toThrow(
        handledException,
      );
      expect(databaseService.handleDatabaseError).toHaveBeenCalledWith(
        mockError,
      );
    });
  });
});
