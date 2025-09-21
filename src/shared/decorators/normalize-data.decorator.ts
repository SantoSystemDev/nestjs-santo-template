import {
  normalizeBoolean,
  normalizeEmail,
  normalizeFloatNumber,
  normalizeIntNumber,
  normalizeName,
  normalizePhoneNumber,
  normalizeString,
  normalizeUrl,
} from '@shared/utils';
import { Transform } from 'class-transformer';

export const NormalizeEmail = () =>
  Transform(({ value }) => normalizeEmail(value));

export const NormalizeName = () =>
  Transform(({ value }) => normalizeName(value));

export const NormalizePhoneNumber = () =>
  Transform(({ value }) => normalizePhoneNumber(value));

export const NormalizeString = () =>
  Transform(({ value }) => normalizeString(value));

export const NormalizeBoolean = () =>
  Transform(({ value }) => normalizeBoolean(value));

export const NormalizeFloat = () =>
  Transform(({ value }) => normalizeFloatNumber(value));

export const NormalizeInt = () =>
  Transform(({ value }) => normalizeIntNumber(value));

export const NormalizeUrl = () => Transform(({ value }) => normalizeUrl(value));
