import {
  normalizeEmail,
  normalizeName,
  normalizePhoneNumber,
  normalizeUrl,
} from '@shared/utils';

export const normalizeUserData = (data: {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isActive?: boolean;
}) => {
  return {
    ...(data.fullName && { fullName: normalizeName(data.fullName) }),
    ...(data.email && { email: normalizeEmail(data.email) }),
    ...(data.phoneNumber && {
      phoneNumber: normalizePhoneNumber(data.phoneNumber),
    }),
    ...(data.avatarUrl && { avatarUrl: normalizeUrl(data.avatarUrl) }),
    ...(data.isActive && { isActive: data.isActive }),
  };
};
