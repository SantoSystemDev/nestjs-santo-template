import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Filtro global de exceções HTTP responsável por padronizar as respostas de erro.
 *
 * Este filtro captura todas as exceções lançadas na aplicação e formata
 * uma resposta consistente com informações sobre o erro.
 *
 * Funcionalidades:
 * - Captura exceções HTTP e genéricas
 * - Formata resposta de erro padronizada
 * - Define status code apropriado
 * - Remove stacktrace em produção por segurança
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Método principal que processa as exceções capturadas.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // Obtém o contexto HTTP da requisição
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Determina o status HTTP baseado no tipo de exceção
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extrai a mensagem de erro da exceção
    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message
        : 'Internal server error';

    // Envia resposta formatada com informações do erro
    response.status(status).json({
      statusCode: status,
      path: request.url,
      message,
      timestamp: new Date().toISOString(),
      // No stacktrace in responses for security reasons
    });
  }
}
