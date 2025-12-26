import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

let app: Hono;
let resetDatabase: () => void;

function jsonRequest(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  return app.fetch(
    new Request(`http://localhost${path}`, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        ...(rest.headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  );
}

function request(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, init));
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.BUN_TEST = '1';

  const { getDatabase } = await import('../../config/database');
  const { default: couponRoutes } = await import('./coupon.routes');

  resetDatabase = () => {
    const db = getDatabase();
    db.run(`
      DELETE FROM payments;
      DELETE FROM orders;
      DELETE FROM carts;
      DELETE FROM coupons;
      DELETE FROM products;
    `);
  };

  app = new Hono();
  app.route('/coupons', couponRoutes);
});

beforeEach(() => resetDatabase());

describe('coupon.routes', () => {
  it('POST /coupons -> 201, GET /coupons/:code -> 200, POST /coupons/:code/calculate -> 200', async () => {
    const now = Date.now();
    const payload = {
      code: 'P15',
      discount_type: 'Percentage',
      discount_value: 15,
      valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    };
    const createRes = await jsonRequest('/coupons', {
      method: 'POST',
      json: payload,
    });
    expect(createRes.status).toBe(201);
    const createBody: any = await createRes.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data.code).toBe('P15');

    const getRes = await request('/coupons/P15', { method: 'GET' });
    expect(getRes.status).toBe(200);
    const getBody: any = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.code).toBe('P15');

    const calcRes = await jsonRequest('/coupons/P15/calculate', {
      method: 'POST',
      json: { original_price: 99 },
    });
    expect(calcRes.status).toBe(200);
    const calcBody: any = await calcRes.json();
    expect(calcBody.success).toBe(true);
    expect(calcBody.data.original_price).toBe(99);
    expect(calcBody.data.discount_amount).toBe(14);
    expect(calcBody.data.final_price).toBe(85);
    expect(calcBody.data.coupon_code).toBe('P15');

    const duplicateRes = await jsonRequest('/coupons', {
      method: 'POST',
      json: payload,
    });
    expect(duplicateRes.status).toBe(409);
    const duplicateBody: any = await duplicateRes.json();
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.code).toBe('CONFLICT');
  });

  it('GET /coupons and GET /coupons/active reflect time-based status', async () => {
    const now = Date.now();
    await jsonRequest('/coupons', {
      method: 'POST',
      json: {
        code: 'ACTIVE',
        discount_type: 'Fixed',
        discount_value: 10,
        valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    await jsonRequest('/coupons', {
      method: 'POST',
      json: {
        code: 'INACTIVE',
        discount_type: 'Fixed',
        discount_value: 10,
        valid_from: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const listRes = await request('/coupons', { method: 'GET' });
    const listBody: any = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(listBody.data.length).toBe(2);

    const activeRes = await request('/coupons/active', { method: 'GET' });
    const activeBody: any = await activeRes.json();
    expect(activeBody.success).toBe(true);
    expect(activeBody.data.map((c: any) => c.code)).toEqual(['ACTIVE']);
  });

  it('returns correct errors for missing coupon and invalid original_price', async () => {
    const missing = await request('/coupons/MISSING', { method: 'GET' });
    expect(missing.status).toBe(404);
    const missingBody: any = await missing.json();
    expect(missingBody.success).toBe(false);
    expect(missingBody.code).toBe('NOT_FOUND');

    const invalid = await jsonRequest('/coupons/MISSING/calculate', {
      method: 'POST',
      json: { original_price: -1 },
    });
    expect(invalid.status).toBe(400);
    const invalidBody: any = await invalid.json();
    expect(invalidBody.success).toBe(false);
    expect(invalidBody.code).toBe('VALIDATION_ERROR');
  });
});


