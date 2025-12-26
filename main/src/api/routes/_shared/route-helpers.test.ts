import { describe, expect, it } from 'bun:test';

import { DomainError } from '../../../domain/core-domain';
import { ConflictError, NotFoundError, ValidationError } from '../../../use-cases/app-errors';
import { handleRouteError } from './route-helpers';

function createContextSpy() {
  const calls: Array<{ body: any; status: number }> = [];
  const c = {
    json: (body: any, status: number) => {
      calls.push({ body, status });
      return { body, status };
    },
  };
  return { c: c as any, calls };
}

describe('handleRouteError', () => {
  it('maps AppError to status and includes code', () => {
    const { c } = createContextSpy();

    const result = handleRouteError(c, new NotFoundError('Order not found')) as any;
    expect(result.status).toBe(404);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('Order not found');
    expect(result.body.code).toBe('NOT_FOUND');
  });

  it('maps DomainError to 400 without code', () => {
    const { c } = createContextSpy();

    const result = handleRouteError(c, new DomainError('Domain broke')) as any;
    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('Domain broke');
    expect(result.body.code).toBeUndefined();
  });

  it('maps unexpected Error to 500', () => {
    const { c } = createContextSpy();

    const result = handleRouteError(c, new Error('Boom')) as any;
    expect(result.status).toBe(500);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('Boom');
  });

  it('exposes codes for Validation/Conflict', () => {
    const { c } = createContextSpy();

    const validation = handleRouteError(c, new ValidationError('Invalid')) as any;
    expect(validation.status).toBe(400);
    expect(validation.body.code).toBe('VALIDATION_ERROR');

    const conflict = handleRouteError(c, new ConflictError('Already exists')) as any;
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('CONFLICT');
  });
});


