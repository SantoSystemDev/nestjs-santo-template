import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  const env = process.env.NODE_ENV ?? 'development';
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const logLevels = (configService.get<string>('LOG_LEVEL') || 'log,error')
    .split(',')
    .map((level) => level.trim()) as (
    | 'log'
    | 'error'
    | 'warn'
    | 'debug'
    | 'verbose'
  )[];
  app.useLogger(logLevels);

  const config = new DocumentBuilder()
    .setTitle('Template Service API')
    .setDescription('The Template Service API description')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
    yamlDocumentUrl: 'swagger/yaml',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.enableCors();
  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'health', method: RequestMethod.ALL }],
  });

  await app.listen(port);

  logger.log(`✅ Server is running on port ${port} [env: ${env}]`);

  if (env === 'development') {
    logger.log(`🌍 Root:     http://localhost:${port}/`);
    logger.log(`📄 Swagger API:  http://localhost:${port}/api`);
    logger.log(`📄 Swagger JSON:  http://localhost:${port}/swagger/json`);
    logger.log(`📄 Swagger YAML:  http://localhost:${port}/swagger/yaml`);
  }
}

bootstrap();
