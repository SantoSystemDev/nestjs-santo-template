import { Module } from '@nestjs/common';
import { HealthModule, UserModule } from './modules';

@Module({
  imports: [HealthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
