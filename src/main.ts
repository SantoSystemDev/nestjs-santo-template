import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import morgan from 'morgan';
import helmet from 'helmet';
import { ThrottlerGuard } from '@nestjs/throttler';
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

  // Middleware de log de requisições HTTP (inclui IP, método, rota, status, tempo)
  // Útil para auditoria e rastreamento de acessos suspeitos
  app.use(
    morgan(
      ':remote-addr :method :url :status :res[content-length] - :response-time ms',
    ),
  );

  // Segurança: Helmet com configuração avançada
  // Helmet protege contra várias vulnerabilidades de HTTP headers.
  // Aqui, adicionamos uma Content Security Policy (CSP) restritiva para evitar ataques XSS e outros.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://apis.google.com'],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

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

  // Tratamento global de erros para logar exceções não tratadas
  app.useGlobalFilters({
    catch(exception, host) {
      const ctx = host.switchToHttp();
      const request = ctx.getRequest();
      const response = ctx.getResponse();
      const status = exception.getStatus ? exception.getStatus() : 500;
      logger.error(
        `Erro ${status} - ${request.method} ${request.url} - IP: ${request.ip} - ${exception.message}`,
      );
      response.status(status).json({
        statusCode: status,
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    },
  });
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

  // Segurança: CORS restrito
  // Em produção, defina explicitamente os domínios permitidos para evitar exposição indevida
  app.enableCors({
    origin: env === 'production' ? ['https://seu-dominio.com'] : true,
    credentials: true,
  });
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
