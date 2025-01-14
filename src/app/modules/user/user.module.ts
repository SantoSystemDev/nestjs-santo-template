import { PrismaService } from '@infra/database';
import { Module } from '@nestjs/common';
import { UserController } from './controllers';
import { CreateUserService } from './services';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [CreateUserService, PrismaService],
  exports: [],
})
export class UserModule {}
