import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export abstract class BaseRepository {
  constructor(protected readonly databaseService: PrismaService) {}

  /**
   * Executa uma operação do Prisma com tratamento automático de erros
   */
  protected async executeQuery<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.databaseService.handleDatabaseError(error);
    }
  }

  /**
   * Executa múltiplas operações em uma transação com tratamento automático de erros
   */
  protected async executeTransaction<T>(
    callback: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.databaseService.$transaction(callback);
    } catch (error) {
      throw this.databaseService.handleDatabaseError(error);
    }
  }
}
