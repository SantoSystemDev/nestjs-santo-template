/**
 * Normaliza um endereço de email removendo espaços extras e convertendo para minúsculas.
 */
export const normalizeEmail = (email?: string): string => {
  return email?.trim().toLowerCase() ?? email; // Normaliza espaços e converte para minúsculas
};

/**
 * Normaliza um nome removendo caracteres especiais e convertendo para maiúsculas.
 * Mantém apenas letras (com acentos) e espaços.
 */
export const normalizeName = (name?: string): string => {
  return (
    normalizeString(name)
      ?.toUpperCase()
      .replace(/[^A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/gi, '') ?? name // Remove tudo exceto letras, acentos e espaços
  );
};

/**
 * Normaliza um número de telefone removendo todos os caracteres não numéricos.
 */
export const normalizePhoneNumber = (phoneNumber?: string): string => {
  return phoneNumber?.trim().replace(/\D/g, '') ?? phoneNumber; // Remove tudo exceto números
};

/**
 * Normaliza uma string removendo espaços extras.
 * Substitui múltiplos espaços por um único espaço.
 */
export const normalizeString = (str?: string): string => {
  return str?.replace(/\s+/g, ' ').trim() ?? str; // Remove espaços extras
};

/**
 * Converte valores string ou boolean para boolean normalizado.
 * Considera 'true' e '1' como verdadeiro para strings.
 */
export const normalizeBoolean = (value?: boolean | string): boolean => {
  if (typeof value === 'string') {
    return ['true', '1'].includes(value.toLowerCase().trim()); // Valores comuns para true
  }
  return Boolean(value);
};

/**
 * Converte valores string ou number para número decimal (float).
 * Retorna 0 se o valor não puder ser convertido.
 */
export const normalizeFloatNumber = (value?: number | string): number => {
  if (typeof value === 'string') {
    const parsed = parseFloat(value.trim());
    return isNaN(parsed) ? 0 : parsed; // Retorna 0 se não conseguir converter
  }
  return isNaN(value) ? 0 : value; // Retorna 0 se number for NaN
};

/**
 * Converte valores string ou number para número inteiro.
 * Retorna 0 se o valor não puder ser convertido.
 */
export const normalizeIntNumber = (value?: number | string): number => {
  if (typeof value === 'string') {
    const parsed = parseInt(value.trim(), 10); // Base 10 para evitar problemas com octal
    return isNaN(parsed) ? 0 : parsed; // Retorna 0 se não conseguir converter
  }
  return isNaN(value) ? 0 : value; // Retorna 0 se number for NaN
};

/**
 * Normaliza uma URL validando se é uma URL válida.
 * Retorna a URL normalizada ou URL original se for inválida.
 */
export const normalizeUrl = (url?: string): string => {
  try {
    const normalizedUrl = new URL(url?.trim()); // Valida e normaliza a URL
    return normalizedUrl.toString();
  } catch {
    return url; // Retorna original se URL for inválida
  }
};
