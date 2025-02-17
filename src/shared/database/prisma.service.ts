import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  /**
   * Initializes the Prisma Client once the module is initialized.
   * This method is called by Nest after the module has been initialized.
   * It connects to the database.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Called once the module is destroyed.
   * This method is called by Nest after the module has been destroyed.
   * It disconnects from the database.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Handles Prisma-specific errors and converts them into NestJS exceptions.
   */
  handleDatabaseError(error: unknown): HttpException {
    if (error instanceof PrismaClientKnownRequestError) {
      this.logger.error(
        `Database Error [${error.code}]: ${error.message}`,
        error.stack,
      );

      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'Duplicate entry: unique constraint failed',
          );
        case 'P2025':
          throw new NotFoundException('Record not found');
        case 'P2003':
          throw new BadRequestException('Foreign key constraint failed');
        default:
          throw new InternalServerErrorException('Unexpected database error');
      }
    }

    this.logger.error('Unknown Database Error', error);
    throw new InternalServerErrorException('Unknown database error');
  }

  /**
   * Executes a transaction using Prisma.
   * @param callback Function that receives the PrismaClient instance.
   * @returns The result of the transaction.
   */
  async transaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return await this.$transaction(callback);
  }

  /**
   * Optional: Middleware or hooks can be added here
   * if needed for logging, metrics, etc.
   */
}
