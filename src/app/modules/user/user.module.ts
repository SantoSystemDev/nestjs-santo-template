import { PrismaService } from '@infra/database';
import { Module } from '@nestjs/common';
import { UserService } from './services';

@Module({
  imports: [],
  controllers: [],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
