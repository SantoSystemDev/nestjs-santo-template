import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }

  /**
   * Called once the module is initialized.
   * Connects to the database.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Called when the module is destroyed.
   * Disconnects from the database.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Optional: Middleware or hooks can be added here
   * if needed for logging, metrics, etc.
   */
}
