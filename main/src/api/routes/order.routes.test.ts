import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

import { CartRepository } from '../../db/repositories/cart.repository';
import { ProductRepository } from '../../db/repositories/product.repository';

import * as cartDomain from '@core/domain/cart';
import * as productDomain from '@core/domain/product';

let app: Hono;
let resetDatabase: () => void;
let getDb: () => any;

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
  const { default: orderRoutes } = await import('./order.routes');

  getDb = getDatabase;
  resetDatabase = () => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM payments;
      DELETE FROM orders;
      DELETE FROM carts;
      DELETE FROM coupons;
      DELETE FROM products;
    `);
  };

  app = new Hono();
  app.route('/orders', orderRoutes);
});

beforeEach(() => resetDatabase());

describe('order.routes', () => {
  it('POST /orders -> 201, GET /orders/:id -> 200, confirm -> 200, complete -> 200', async () => {
    const db = getDb();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: new Date('2000-01-01T00:00:00.000Z').getTime(),
      end_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
    });
    const cart = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
      keep_until: new Date('2100-01-02T00:00:00.000Z').getTime(),
    });

    const createdRes = await jsonRequest('/orders', {
      method: 'POST',
      json: {
        cart_id: cartDomain.cart_id(cart),
        product_id: productDomain.product_id(product),
        coupon_id: null,
        quantity: 1,
        paid_amount: 100,
        discount_amount: 0,
      },
    });
    expect(createdRes.status).toBe(201);
    const createdBody: any = await createdRes.json();
    expect(createdBody.success).toBe(true);
    const orderId = createdBody.data.order_id as number;

    const getRes = await request(`/orders/${orderId}`, { method: 'GET' });
    expect(getRes.status).toBe(200);
    const getBody: any = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.order_id).toBe(orderId);
    expect(getBody.data.status).toBe('Pending');

    const confirmRes = await request(`/orders/${orderId}/confirm`, { method: 'POST' });
    expect(confirmRes.status).toBe(200);
    const confirmBody: any = await confirmRes.json();
    expect(confirmBody.success).toBe(true);
    expect(confirmBody.data.status).toBe('Confirmed');

    const completeRes = await request(`/orders/${orderId}/complete`, { method: 'POST' });
    expect(completeRes.status).toBe(200);
    const completeBody: any = await completeRes.json();
    expect(completeBody.success).toBe(true);
    expect(completeBody.data.status).toBe('Completed');

    const cancelAfterCompleteRes = await request(`/orders/${orderId}/cancel`, { method: 'POST' });
    expect(cancelAfterCompleteRes.status).toBe(400);
    const cancelAfterCompleteBody: any = await cancelAfterCompleteRes.json();
    expect(cancelAfterCompleteBody.success).toBe(false);
    expect(cancelAfterCompleteBody.code).toBeUndefined();
  });

  it('GET /orders -> 200 list', async () => {
    const listRes = await request('/orders', { method: 'GET' });
    expect(listRes.status).toBe(200);
    const listBody: any = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBe(0);
  });

  it('complete on Pending order returns DomainError (400 without code)', async () => {
    const db = getDb();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: new Date('2000-01-01T00:00:00.000Z').getTime(),
      end_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
    });
    const cart = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
      keep_until: new Date('2100-01-02T00:00:00.000Z').getTime(),
    });

    const createdRes = await jsonRequest('/orders', {
      method: 'POST',
      json: {
        cart_id: cartDomain.cart_id(cart),
        product_id: productDomain.product_id(product),
        coupon_id: null,
        quantity: 1,
        paid_amount: 100,
        discount_amount: 0,
      },
    });
    const createdBody: any = await createdRes.json();
    const orderId = createdBody.data.order_id as number;

    const completeRes = await request(`/orders/${orderId}/complete`, { method: 'POST' });
    expect(completeRes.status).toBe(400);
    const completeBody: any = await completeRes.json();
    expect(completeBody.success).toBe(false);
    expect(completeBody.code).toBeUndefined();
  });

  it('returns validation/not-found errors with correct status/code', async () => {
    const invalidId = await request('/orders/abc', { method: 'GET' });
    expect(invalidId.status).toBe(400);
    const invalidIdBody: any = await invalidId.json();
    expect(invalidIdBody.success).toBe(false);
    expect(invalidIdBody.code).toBe('VALIDATION_ERROR');

    const notFound = await request('/orders/9999', { method: 'GET' });
    expect(notFound.status).toBe(404);
    const notFoundBody: any = await notFound.json();
    expect(notFoundBody.success).toBe(false);
    expect(notFoundBody.code).toBe('NOT_FOUND');
  });
});


