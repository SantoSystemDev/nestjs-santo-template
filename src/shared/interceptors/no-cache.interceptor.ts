import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor responsável por desabilitar o cache nas respostas HTTP.
 *
 * Este interceptor adiciona o header 'Cache-Control: no-store' em todas as respostas,
 * garantindo que navegadores e proxies não armazenem a resposta em cache.
 *
 * Útil para:
 * - Dados sensíveis (informações pessoais, tokens)
 * - Informações que mudam frequentemente
 * - APIs que retornam dados em tempo real
 * - Endpoints de autenticação/logout
 */
@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  /**
   * Intercepta a requisição e define o header de cache antes da resposta ser enviada.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Obtém o objeto de resposta HTTP do contexto
    const response = context.switchToHttp().getResponse();

    // Define o header Cache-Control para impedir o armazenamento em cache
    response.set('Cache-Control', 'no-store');

    // Permite que a requisição continue o fluxo normal
    return next.handle();
  }
}
