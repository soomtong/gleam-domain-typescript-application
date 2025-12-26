import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly status: ContentfulStatusCode;
  public readonly code: AppErrorCode;

  constructor(params: { message: string; status: ContentfulStatusCode; code: AppErrorCode; cause?: unknown }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    // Node/Bun supports Error.cause, but keep it non-breaking if not.
    (this as any).cause = params.cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({ message, status: 400, code: 'VALIDATION_ERROR', cause });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({ message, status: 404, code: 'NOT_FOUND', cause });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({ message, status: 409, code: 'CONFLICT', cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}


