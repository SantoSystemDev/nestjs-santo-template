import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from './prisma.service';

describe(PrismaService.name, () => {
  let service: PrismaService;

  beforeAll(async () => {
    const mockPrismaService = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn((callback) => callback()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: PrismaClient, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(PrismaService);
    service.$connect = mockPrismaService.$connect;
    service.$disconnect = mockPrismaService.$disconnect;
    service.$transaction = mockPrismaService.$transaction;
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization and Destruction', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should connect to the database on module init', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
    });

    it('should disconnect from the database on module destroy', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle P2002 error and throw ConflictException', () => {
      const error = new PrismaClientKnownRequestError('Duplicate entry', {
        code: 'P2002',
        clientVersion: '2.0.0',
        meta: {},
      });
      expect(() => service.handleDatabaseError(error)).toThrow(
        ConflictException,
      );
    });

    it('should handle P2003 error and throw BadRequestException', () => {
      const error = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '2.0.0',
          meta: {},
        },
      );
      expect(() => service.handleDatabaseError(error)).toThrow(
        BadRequestException,
      );
    });

    it('should handle P2025 error and throw NotFoundException', () => {
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '2.0.0',
        meta: {},
      });
      expect(() => service.handleDatabaseError(error)).toThrow(
        NotFoundException,
      );
    });

    it('should handle P9999 error and throw InternalServerErrorException', () => {
      const error = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P9999',
          clientVersion: '2.0.0',
          meta: {},
        },
      );
      expect(() => service.handleDatabaseError(error)).toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(() => service.handleDatabaseError(error)).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Transactions', () => {
    it('should call $transaction with the provided callback', async () => {
      const mockCallback = jest.fn().mockResolvedValue('transaction result');
      const result = await service.transaction(mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(result).toBe('transaction result');
    });
  });
});
