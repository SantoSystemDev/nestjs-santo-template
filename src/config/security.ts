import { INestApplication } from '@nestjs/common';

/**
 * Configura o CORS (Cross-Origin Resource Sharing) para a aplicação.
 *
 * Esta função habilita e configura o CORS com base nas origens permitidas
 * definidas na variável de ambiente CORS_ORIGINS.
 *
 * Funcionalidades:
 * - Permite apenas origens específicas configuradas via env
 * - Habilita credenciais (cookies, headers de auth)
 * - Define métodos HTTP permitidos
 * - Configura headers permitidos
 * - Define cache do preflight (OPTIONS)
 */
export function setupCors(app: INestApplication) {
  // Obtém e processa as origens permitidas da variável de ambiente
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    // Função que valida se a origem da requisição é permitida
    origin: (origin, cb) => {
      // Permite requisições sem origin (ex: Postman) ou origens na lista
      if (!origin || origins.includes(origin)) return cb(null, true);
      // Rejeita origens não autorizadas
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true, // Permite envio de cookies e headers de autenticação
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos nas requisições
    maxAge: 600, // Cache do preflight OPTIONS por 10 minutos (600 segundos)
  });
}
