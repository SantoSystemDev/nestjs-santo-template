export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const normalizeFullName = (fullName: string): string => {
  return fullName.trim().toUpperCase();
};

export const normalizePhoneNumber = (
  phoneNumber: string | undefined,
): string | undefined => {
  return phoneNumber?.trim().replace(/\D/g, '');
};
