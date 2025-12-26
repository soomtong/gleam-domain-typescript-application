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
  const { default: productRoutes } = await import('./product.routes');

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
  app.route('/products', productRoutes);
});

beforeEach(() => resetDatabase());

describe('product.routes', () => {
  it('POST /products -> 201, then GET /products/:id -> 200, then PATCH /products/:id/stock -> 200', async () => {
    const createdRes = await jsonRequest('/products', {
      method: 'POST',
      json: {
        title: 'T',
        price: 100,
        stock: 10,
        begin_at: new Date('2000-01-01T00:00:00.000Z').getTime(),
        end_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
      },
    });
    expect(createdRes.status).toBe(201);
    const createdBody: any = await createdRes.json();
    expect(createdBody.success).toBe(true);
    expect(createdBody.data.product_id).toBeGreaterThan(0);

    const productId = createdBody.data.product_id as number;

    const getRes = await request(`/products/${productId}`, { method: 'GET' });
    expect(getRes.status).toBe(200);
    const getBody: any = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.product_id).toBe(productId);
    expect(getBody.data.title).toBe('T');

    const patchRes = await jsonRequest(`/products/${productId}/stock`, {
      method: 'PATCH',
      json: { stock: 0 },
    });
    expect(patchRes.status).toBe(200);
    const patchBody: any = await patchRes.json();
    expect(patchBody.success).toBe(true);
    expect(patchBody.data.stock).toBe(0);
    expect(patchBody.data.status).toBe('OutOfStock');
  });

  it('GET /products -> 200 with empty list, then list size increases after create', async () => {
    const emptyRes = await request('/products', { method: 'GET' });
    expect(emptyRes.status).toBe(200);
    const emptyBody: any = await emptyRes.json();
    expect(emptyBody.success).toBe(true);
    expect(Array.isArray(emptyBody.data)).toBe(true);
    expect(emptyBody.data.length).toBe(0);

    await jsonRequest('/products', {
      method: 'POST',
      json: {
        title: 'T',
        price: 100,
        stock: 10,
        begin_at: new Date('2000-01-01T00:00:00.000Z').getTime(),
        end_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
      },
    });

    const listRes = await request('/products', { method: 'GET' });
    const listBody: any = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(listBody.data.length).toBe(1);
  });

  it('returns validation/not-found errors with correct status/code', async () => {
    const invalidId = await request('/products/abc', { method: 'GET' });
    expect(invalidId.status).toBe(400);
    const invalidIdBody: any = await invalidId.json();
    expect(invalidIdBody.success).toBe(false);
    expect(invalidIdBody.code).toBe('VALIDATION_ERROR');

    const notFound = await request('/products/9999', { method: 'GET' });
    expect(notFound.status).toBe(404);
    const notFoundBody: any = await notFound.json();
    expect(notFoundBody.success).toBe(false);
    expect(notFoundBody.code).toBe('NOT_FOUND');

    const invalidCreate = await jsonRequest('/products', {
      method: 'POST',
      json: {
        title: '',
        price: 100,
        stock: 10,
        begin_at: new Date('2000-01-01T00:00:00.000Z').getTime(),
        end_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
      },
    });
    expect(invalidCreate.status).toBe(400);
    const invalidCreateBody: any = await invalidCreate.json();
    expect(invalidCreateBody.success).toBe(false);
    expect(invalidCreateBody.code).toBe('VALIDATION_ERROR');
  });
});


