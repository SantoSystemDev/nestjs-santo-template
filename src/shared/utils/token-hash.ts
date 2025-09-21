import crypto from 'crypto';

/**
 * Gera um hash seguro e determinístico para tokens de refresh.
 *
 * Esta função utiliza HMAC-SHA256 para criar um hash irreversível do token,
 * adicionando uma camada extra de segurança através do "pepper" (chave secreta do servidor).
 *
 * Funcionalidades:
 * - Hash determinístico (mesmo input = mesmo output)
 * - Irreversível (não é possível recuperar o token original)
 * - Adiciona pepper para proteção contra ataques de dicionário
 * - Usado para armazenar tokens de forma segura no banco de dados
 *
 * @param raw - Token de refresh em texto puro
 * @param pepper - Chave secreta do servidor (geralmente JWT_REFRESH_SECRET)
 * @returns Hash hexadecimal de 64 caracteres
 */
export function hashRefreshToken(raw: string, pepper: string): string {
  // Cria hash HMAC-SHA256 usando o pepper como chave secreta
  return crypto
    .createHmac('sha256', pepper) // Define algoritmo e chave secreta
    .update(raw) // Adiciona o token original ao hash
    .digest('hex'); // Converte para string hexadecimal
}
