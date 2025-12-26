import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { CouponRepository } from '../../db/repositories/coupon.repository';
import { ProductRepository } from '../../db/repositories/product.repository';
import * as couponDomain from '@core/domain/coupon';
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
  const { default: cartRoutes } = await import('./cart.routes');

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
  app.route('/carts', cartRoutes);
});

beforeEach(() => resetDatabase());

describe('cart.routes', () => {
  it('POST /carts -> 201, GET /carts/:id -> 200, PATCH quantity/coupon -> 200, POST checkout -> 201', async () => {
    const db = getDb();
    const productRepo = new ProductRepository(db);
    const couponRepo = new CouponRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });
    const now = Date.now();
    const coupon = couponRepo.create({
      code: 'P10',
      discount_type: 'Percentage',
      discount_value: 10,
      valid_from: now - 24 * 60 * 60 * 1000,
      valid_until: now + 24 * 60 * 60 * 1000,
    });

    const createdRes = await jsonRequest('/carts', {
      method: 'POST',
      json: {
        product_id: productDomain.product_id(product),
        quantity: 2,
      },
    });
    expect(createdRes.status).toBe(201);
    const createdBody: any = await createdRes.json();
    expect(createdBody.success).toBe(true);
    const cartId = createdBody.data.cart_id as number;

    const getRes = await request(`/carts/${cartId}`, { method: 'GET' });
    expect(getRes.status).toBe(200);
    const getBody: any = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.cart_id).toBe(cartId);
    expect(getBody.data.quantity).toBe(2);

    const qtyRes = await jsonRequest(`/carts/${cartId}/quantity`, {
      method: 'PATCH',
      json: { quantity: 1 },
    });
    expect(qtyRes.status).toBe(200);
    const qtyBody: any = await qtyRes.json();
    expect(qtyBody.success).toBe(true);
    expect(qtyBody.data.quantity).toBe(1);

    const couponRes = await jsonRequest(`/carts/${cartId}/coupon`, {
      method: 'PATCH',
      json: { coupon_id: couponDomain.coupon_id(coupon) },
    });
    expect(couponRes.status).toBe(200);
    const couponBody: any = await couponRes.json();
    expect(couponBody.success).toBe(true);
    expect(couponBody.data.coupon_id).toBe(couponDomain.coupon_id(coupon));

    const removedCouponRes = await jsonRequest(`/carts/${cartId}/coupon`, {
      method: 'PATCH',
      json: { coupon_id: null },
    });
    expect(removedCouponRes.status).toBe(200);
    const removedCouponBody: any = await removedCouponRes.json();
    expect(removedCouponBody.success).toBe(true);
    expect(removedCouponBody.data.coupon_id).toBeNull();

    const reAddedCouponRes = await jsonRequest(`/carts/${cartId}/coupon`, {
      method: 'PATCH',
      json: { coupon_id: couponDomain.coupon_id(coupon) },
    });
    expect(reAddedCouponRes.status).toBe(200);
    const reAddedCouponBody: any = await reAddedCouponRes.json();
    expect(reAddedCouponBody.success).toBe(true);
    expect(reAddedCouponBody.data.coupon_id).toBe(couponDomain.coupon_id(coupon));

    const checkoutRes = await request(`/carts/${cartId}/checkout`, { method: 'POST' });
    expect(checkoutRes.status).toBe(201);
    const checkoutBody: any = await checkoutRes.json();
    expect(checkoutBody.success).toBe(true);
    expect(checkoutBody.data.cart_id).toBe(cartId);
    expect(checkoutBody.data.order_id).toBeGreaterThan(0);
    expect(checkoutBody.data.discount_amount).toBeGreaterThan(0);
    expect(checkoutBody.data.coupon_code).toBe('P10');
  });

  it('GET /carts and GET /carts/active reflect expired carts', async () => {
    const db = getDb();
    const productRepo = new ProductRepository(db);
    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    await jsonRequest('/carts', {
      method: 'POST',
      json: {
        product_id: productDomain.product_id(product),
        quantity: 1,
        expired_at: new Date('2100-01-01T00:00:00.000Z').getTime(),
        keep_until: new Date('2100-01-02T00:00:00.000Z').getTime(),
      },
    });
    await jsonRequest('/carts', {
      method: 'POST',
      json: {
        product_id: productDomain.product_id(product),
        quantity: 1,
        expired_at: new Date('2000-01-01T00:00:00.000Z').getTime(),
        keep_until: new Date('2100-01-02T00:00:00.000Z').getTime(),
      },
    });

    const allRes = await request('/carts', { method: 'GET' });
    const allBody: any = await allRes.json();
    expect(allBody.success).toBe(true);
    expect(allBody.data.length).toBe(2);

    const activeRes = await request('/carts/active', { method: 'GET' });
    const activeBody: any = await activeRes.json();
    expect(activeBody.success).toBe(true);
    expect(activeBody.data.length).toBe(1);
    expect(activeBody.data[0].status).toBe('Active');
  });

  it('returns validation/not-found errors with correct status/code', async () => {
    const invalidId = await request('/carts/abc', { method: 'GET' });
    expect(invalidId.status).toBe(400);
    const invalidIdBody: any = await invalidId.json();
    expect(invalidIdBody.success).toBe(false);
    expect(invalidIdBody.code).toBe('VALIDATION_ERROR');

    const notFound = await request('/carts/9999', { method: 'GET' });
    expect(notFound.status).toBe(404);
    const notFoundBody: any = await notFound.json();
    expect(notFoundBody.success).toBe(false);
    expect(notFoundBody.code).toBe('NOT_FOUND');

    const invalidCreate = await jsonRequest('/carts', {
      method: 'POST',
      json: {
        // product_id missing
        quantity: 1,
      },
    });
    expect(invalidCreate.status).toBe(400);
    const invalidCreateBody: any = await invalidCreate.json();
    expect(invalidCreateBody.success).toBe(false);
    expect(invalidCreateBody.code).toBe('VALIDATION_ERROR');

    const db = getDb();
    const productRepo = new ProductRepository(db);
    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 1,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    const insufficientStock = await jsonRequest('/carts', {
      method: 'POST',
      json: { product_id: productDomain.product_id(product), quantity: 2 },
    });
    expect(insufficientStock.status).toBe(400);
    const insufficientStockBody: any = await insufficientStock.json();
    expect(insufficientStockBody.success).toBe(false);
    expect(insufficientStockBody.code).toBe('VALIDATION_ERROR');
  });
});


