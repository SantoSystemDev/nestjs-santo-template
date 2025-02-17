import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/database';
import { UserProviders } from './infrastructure/providers';
import { UserController } from './presentation/controllers';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [PrismaService, ...UserProviders],
  exports: [...UserProviders],
})
export class UserModule {}
