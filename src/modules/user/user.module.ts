import { Module } from '@nestjs/common';
import { UserProviders } from './infrastructure/providers';
import { UserController } from './presentation/controllers';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [...UserProviders],
  exports: [],
})
export class UserModule {}
