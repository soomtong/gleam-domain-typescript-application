import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

import { CartRepository } from '@main/db/repositories/cart.repository';
import { OrderRepository } from '@main/db/repositories/order.repository';
import { ProductRepository } from '@main/db/repositories/product.repository';

import * as cartDomain from '@core/domain/cart';
import * as orderDomain from '@core/domain/order';
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

function seedOrder(db: any, status: 'Pending' | 'Confirmed') {
  const productRepo = new ProductRepository(db);
  const cartRepo = new CartRepository(db);
  const orderRepo = new OrderRepository(db);

  const product = productRepo.create({
    title: 'T',
    price: 100,
    stock: 10,
    begin_at: '2000-01-01T00:00:00.000Z',
    end_at: '2100-01-01T00:00:00.000Z',
  });
  const cart = cartRepo.create({
    product_id: productDomain.product_id(product),
    coupon_id: null,
    quantity: 1,
    expired_at: '2100-01-01T00:00:00.000Z',
    keep_until: '2100-01-02T00:00:00.000Z',
  });
  const order = orderRepo.create({
    cart_id: cartDomain.cart_id(cart),
    product_id: productDomain.product_id(product),
    coupon_id: null,
    quantity: 1,
    paid_amount: 100,
    discount_amount: 0,
  });

  if (status === 'Confirmed') {
    orderRepo.updateStatus(orderDomain.order_id(order), 'Confirmed');
  }

  return orderDomain.order_id(order);
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.BUN_TEST = '1';

  const { getDatabase } = await import('../../config/database');
  const { default: paymentRoutes } = await import('./payment.routes');

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
  app.route('/payments', paymentRoutes);
});

beforeEach(() => resetDatabase());

describe('payment.routes', () => {
  it('POST /payments -> 201, GET /payments/:id -> 200, GET /payments -> 200', async () => {
    const db = getDb();
    const orderId = seedOrder(db, 'Confirmed');

    const createdRes = await jsonRequest('/payments', {
      method: 'POST',
      json: { order_id: orderId, amount: 100 },
    });
    expect(createdRes.status).toBe(201);
    const createdBody = await createdRes.json();
    expect(createdBody.success).toBe(true);
    const paymentId = createdBody.data.payment_id as number;

    const getRes = await request(`/payments/${paymentId}`, { method: 'GET' });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.payment_id).toBe(paymentId);
    expect(getBody.data.order_id).toBe(orderId);
    expect(getBody.data.status).toBe('Pending');

    const listRes = await request('/payments', { method: 'GET' });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(listBody.data.length).toBe(1);
  });

  it('POST /payments conflict -> 409, and validation/not-found errors map correctly', async () => {
    const db = getDb();
    const confirmedOrderId = seedOrder(db, 'Confirmed');

    await jsonRequest('/payments', {
      method: 'POST',
      json: { order_id: confirmedOrderId, amount: 100 },
    });

    const conflict = await jsonRequest('/payments', {
      method: 'POST',
      json: { order_id: confirmedOrderId, amount: 100 },
    });
    expect(conflict.status).toBe(409);
    const conflictBody = await conflict.json();
    expect(conflictBody.success).toBe(false);
    expect(conflictBody.code).toBe('CONFLICT');

    const notFound = await jsonRequest('/payments', {
      method: 'POST',
      json: { order_id: 9999, amount: 100 },
    });
    expect(notFound.status).toBe(404);
    const notFoundBody = await notFound.json();
    expect(notFoundBody.success).toBe(false);
    expect(notFoundBody.code).toBe('NOT_FOUND');

    const pendingOrderId = seedOrder(db, 'Pending');
    const notConfirmed = await jsonRequest('/payments', {
      method: 'POST',
      json: { order_id: pendingOrderId, amount: 100 },
    });
    expect(notConfirmed.status).toBe(400);
    const notConfirmedBody = await notConfirmed.json();
    expect(notConfirmedBody.success).toBe(false);
    expect(notConfirmedBody.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/:id/complete and /refund update status', async () => {
    const db = getDb();
    const orderId = seedOrder(db, 'Confirmed');
    const createdRes = await jsonRequest('/payments', {
      method: 'POST',
      json: { order_id: orderId, amount: 100 },
    });
    const createdBody = await createdRes.json();
    const paymentId = createdBody.data.payment_id as number;

    const completeRes = await request(`/payments/${paymentId}/complete`, { method: 'POST' });
    expect(completeRes.status).toBe(200);
    const completeBody = await completeRes.json();
    expect(completeBody.success).toBe(true);
    expect(completeBody.data.status).toBe('Completed');

    const refundRes = await request(`/payments/${paymentId}/refund`, { method: 'POST' });
    expect(refundRes.status).toBe(200);
    const refundBody = await refundRes.json();
    expect(refundBody.success).toBe(true);
    expect(refundBody.data.status).toBe('Refunded');
  });

  it('returns validation/not-found errors for id params', async () => {
    const invalidId = await request('/payments/abc', { method: 'GET' });
    expect(invalidId.status).toBe(400);
    const invalidIdBody = await invalidId.json();
    expect(invalidIdBody.success).toBe(false);
    expect(invalidIdBody.code).toBe('VALIDATION_ERROR');

    const notFound = await request('/payments/9999', { method: 'GET' });
    expect(notFound.status).toBe(404);
    const notFoundBody = await notFound.json();
    expect(notFoundBody.success).toBe(false);
    expect(notFoundBody.code).toBe('NOT_FOUND');
  });
});


