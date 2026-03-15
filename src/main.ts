import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { version } from '../package.json';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ignora campos extras no body silenciosamente
      transform: true, // habilita class-transformer nos DTOs
      transformOptions: {
        enableImplicitConversion: true, // converte query params pelo tipo TypeScript ("1" → number)
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Santo Template API')
      .setDescription(
        'Documentação interativa dos endpoints da Santo Template API.',
      )
      .setVersion(version)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        urls: [{ url: '/docs-json', name: 'Santo Template API (gerada)' }],
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
