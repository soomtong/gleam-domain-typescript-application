import { ValidationError } from '@main/use-cases/app-errors';

export function parseDateTimeToMillis(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new ValidationError(`Invalid ${fieldName}`);
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.trunc(numeric);
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  throw new ValidationError(`Invalid ${fieldName}`);
}


