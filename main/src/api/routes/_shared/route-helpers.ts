import type { Context } from 'hono';

import { DomainError } from '../../../domain/core-domain';
import { isAppError, ValidationError } from '../../../use-cases/app-errors';

export function parseIntParamOrThrow(c: Context, name: string): number {
  const rawValue = c.req.param(name);
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    throw new ValidationError(`Invalid ${name}`);
  }
  return parsed;
}

export function handleRouteError(c: Context, error: unknown) {
  if (isAppError(error)) {
    return c.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      error.status
    );
  }

  // Domain-level errors already carry a user-facing message.
  if (error instanceof DomainError) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      400
    );
  }

  if (error instanceof Error) {
    return c.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }

  return c.json(
    {
      success: false,
      error: 'Internal server error',
    },
    500
  );
}


