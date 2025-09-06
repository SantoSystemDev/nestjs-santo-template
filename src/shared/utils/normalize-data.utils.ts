export const normalizeEmail = (email?: string): string => {
  return email?.trim().toLowerCase() || '';
};

export const normalizeName = (name?: string): string => {
  return normalizeString(name).toUpperCase() || '';
};

export const normalizePhoneNumber = (phoneNumber?: string): string => {
  return phoneNumber?.trim().replace(/\D/g, '') || '';
};

export const normalizeString = (str?: string): string => {
  return str?.replace(/\s+/g, ' ').trim() || '';
};

export const normalizeBoolean = (value?: boolean | string): boolean => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return !!value;
};

export const normalizeFloatNumber = (value?: number | string): number => {
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return value || 0;
};

export const normalizeIntNumber = (value?: number | string): number => {
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return value || 0;
};

export const normalizeUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const normalizedUrl = new URL(url);
    return normalizedUrl.toString();
  } catch {
    return '';
  }
};
