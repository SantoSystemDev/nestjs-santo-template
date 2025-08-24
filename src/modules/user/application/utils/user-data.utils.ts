/**
 * Pure utility functions for normalizing user data
 */

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

export const normalizeUserData = (data: {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
}) => {
  return {
    ...(data.email && { email: normalizeEmail(data.email) }),
    ...(data.fullName && { fullName: normalizeFullName(data.fullName) }),
    ...(data.phoneNumber !== undefined && {
      phoneNumber: normalizePhoneNumber(data.phoneNumber),
    }),
  };
};
