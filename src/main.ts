import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HttpExceptionFilter } from '@shared/filters/http-exception.filter';
import { NoCacheInterceptor } from '@shared/interceptors/no-cache.interceptor';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { setupCors } from 'src/config/security';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  const env = process.env.NODE_ENV ?? 'development';
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Segurança: Helmet com configuração avançada
  // Helmet protege contra várias vulnerabilidades de HTTP headers.
  // Aqui, adicionamos uma Content Security Policy (CSP) restritiva para evitar ataques XSS e outros.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // para permitir carregamento de imagens de outros domínios
    }),
  );
  app.use(cookieParser());
  setupCors(app);

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

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

  // // Middleware de log de requisições HTTP (inclui IP, método, rota, status, tempo)
  // // Útil para auditoria e rastreamento de acessos suspeitos
  // app.use(
  //   morgan(
  //     ':remote-addr :method :url :status :res[content-length] - :response-time ms',
  //   ),
  // );

  const config = new DocumentBuilder()
    .setTitle('Template Service API')
    .setDescription('The Template Service API description')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, documentFactory);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
    yamlDocumentUrl: 'swagger/yaml',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // transforma payloads em DTOs
      whitelist: true, // remove propriedades não definidas nos DTOs
      forbidNonWhitelisted: true, // erro ao receber propriedades não definidas
      forbidUnknownValues: true, // erro ao receber valores que não são objetos
    }),
  );

  // Tratamento global de erros para logar exceções não tratadas
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new NoCacheInterceptor());

  // Segurança: Rate limiting global
  // Throttler limita o número de requisições por IP (protege contra DDoS e brute force)
  // Logs de bloqueio podem ser implementados via custom guard se necessário
  app.useGlobalGuards(
    new ThrottlerGuard(
      app.get(ThrottlerGuard),
      app.get('ThrottlerStorageService'),
      app.get('Reflector'),
    ),
  );

  // Prefixo global de rotas (exclui health check)
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
