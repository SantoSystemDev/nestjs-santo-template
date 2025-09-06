import {
  normalizeEmail,
  normalizeName,
  normalizePhoneNumber,
} from '@shared/utils';

export const normalizeUserData = (data: {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
}) => {
  return {
    ...(data.email && { email: normalizeEmail(data.email) }),
    ...(data.fullName && { fullName: normalizeName(data.fullName) }),
    ...(data.phoneNumber !== undefined && {
      phoneNumber: normalizePhoneNumber(data.phoneNumber),
    }),
  };
};
