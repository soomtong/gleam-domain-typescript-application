import { describe, expect, it } from 'bun:test';

import { getDatabase } from '@main/config/database';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string; code?: string };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

let apiFetch: (request: Request) => Promise<Response>;
let requestLock: Promise<void> = Promise.resolve();

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = requestLock;
  let release!: () => void;
  requestLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function getApiFetch(): Promise<(request: Request) => Promise<Response>> {
  if (apiFetch) return apiFetch;

  const originalLog = console.log;
  console.log = () => {};
  try {
    const mod = await import('@main/index');
    apiFetch = mod.default.fetch;
    return apiFetch;
  } finally {
    console.log = originalLog;
  }
}

function resetSingletonDatabase(): void {
  const db = getDatabase();
  db.run('PRAGMA foreign_keys = OFF');
  db.exec(`
    DELETE FROM payments;
    DELETE FROM orders;
    DELETE FROM carts;
    DELETE FROM coupons;
    DELETE FROM products;
  `);
  db.exec(`
    DELETE FROM sqlite_sequence WHERE name IN ('payments', 'orders', 'carts', 'coupons', 'products');
  `);
  db.run('PRAGMA foreign_keys = ON');
}

async function requestJson<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: T }> {
  const fetchFn = await getApiFetch();
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const response = await fetchFn(request);
  const json = (await response.json()) as T;
  return { status: response.status, json };
}

async function createProduct(): Promise<{ product_id: number }> {
  const { status, json } = await requestJson<ApiResponse<{ product_id: number }>>('POST', '/products', {
    title: 'T',
    price: 100,
    stock: 10,
    begin_at: '2000-01-01T00:00:00.000Z',
    end_at: '2100-01-01T00:00:00.000Z',
  });
  expect(status).toBe(201);
  expect(json.success).toBe(true);
  return (json as ApiSuccess<{ product_id: number }>).data;
}

async function createCoupon(code: string): Promise<{ coupon_id: number }> {
  const now = Date.now();
  const { status, json } = await requestJson<ApiResponse<{ coupon_id: number }>>('POST', '/coupons', {
    code,
    discount_type: 'Percentage',
    discount_value: 10,
    valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
  });
  expect(status).toBe(201);
  expect(json.success).toBe(true);
  return (json as ApiSuccess<{ coupon_id: number }>).data;
}

async function createCart(params: { product_id: number; coupon_id?: number | null; quantity: number }) {
  const { status, json } = await requestJson<ApiResponse<{ cart_id: number }>>('POST', '/carts', params);
  expect(status).toBe(201);
  expect(json.success).toBe(true);
  return (json as ApiSuccess<{ cart_id: number }>).data;
}

describe('API routes (Hono)', () => {
  it('health check returns server info', async () => {
    await withLock(async () => {
      resetSingletonDatabase();
      const { status, json } = await requestJson<any>('GET', '/');
      expect(status).toBe(200);
      expect(json.status).toBe('ok');
      expect(json.endpoints.products).toBe('/products');
      expect(json.endpoints.coupons).toBe('/coupons');
      expect(json.endpoints.carts).toBe('/carts');
      expect(json.endpoints.orders).toBe('/orders');
      expect(json.endpoints.payments).toBe('/payments');
    });
  });

  it('products routes: list/create/get/update stock + invalid id', async () => {
    await withLock(async () => {
      resetSingletonDatabase();

      const created = await createProduct();

      const list = await requestJson<ApiResponse<any[]>>('GET', '/products');
      expect(list.status).toBe(200);
      expect(list.json.success).toBe(true);
      expect((list.json as ApiSuccess<any[]>).data.length).toBe(1);

      const get = await requestJson<ApiResponse<any>>('GET', `/products/${created.product_id}`);
      expect(get.status).toBe(200);
      expect(get.json.success).toBe(true);
      expect((get.json as ApiSuccess<any>).data.product_id).toBe(created.product_id);

      const updated = await requestJson<ApiResponse<any>>(
        'PATCH',
        `/products/${created.product_id}/stock`,
        { stock: 0 }
      );
      expect(updated.status).toBe(200);
      expect(updated.json.success).toBe(true);
      expect((updated.json as ApiSuccess<any>).data.status).toBe('OutOfStock');

      const invalid = await requestJson<ApiResponse<any>>('GET', '/products/abc');
      expect(invalid.status).toBe(400);
      expect(invalid.json.success).toBe(false);
      expect((invalid.json as ApiFailure).code).toBe('VALIDATION_ERROR');
    });
  });

  it('coupons routes: list/create/get/active/calculate + duplicate', async () => {
    await withLock(async () => {
      resetSingletonDatabase();

      await createCoupon('P10');

      const list = await requestJson<ApiResponse<any[]>>('GET', '/coupons');
      expect(list.status).toBe(200);
      expect(list.json.success).toBe(true);
      expect((list.json as ApiSuccess<any[]>).data.length).toBe(1);

      const active = await requestJson<ApiResponse<any[]>>('GET', '/coupons/active');
      expect(active.status).toBe(200);
      expect(active.json.success).toBe(true);
      expect((active.json as ApiSuccess<any[]>).data.length).toBe(1);

      const get = await requestJson<ApiResponse<any>>('GET', '/coupons/P10');
      expect(get.status).toBe(200);
      expect(get.json.success).toBe(true);
      expect((get.json as ApiSuccess<any>).data.code).toBe('P10');

      const calc = await requestJson<ApiResponse<any>>('POST', '/coupons/P10/calculate', {
        original_price: 100,
      });
      expect(calc.status).toBe(200);
      expect(calc.json.success).toBe(true);
      expect((calc.json as ApiSuccess<any>).data.discount_amount).toBe(10);
      expect((calc.json as ApiSuccess<any>).data.final_price).toBe(90);

      const dup = await requestJson<ApiResponse<any>>('POST', '/coupons', {
        code: 'P10',
        discount_type: 'Percentage',
        discount_value: 10,
        valid_from: new Date(Date.now() - 1000).toISOString(),
        valid_until: new Date(Date.now() + 1000).toISOString(),
      });
      expect(dup.status).toBe(409);
      expect(dup.json.success).toBe(false);
      expect((dup.json as ApiFailure).code).toBe('CONFLICT');
    });
  });

  it('carts routes: create/get/list/active/update coupon+quantity/checkout + invalid param + missing cart', async () => {
    await withLock(async () => {
      resetSingletonDatabase();

      const { product_id } = await createProduct();
      const { coupon_id } = await createCoupon('P10');

      const { cart_id } = await createCart({ product_id, coupon_id, quantity: 1 });

      const get = await requestJson<ApiResponse<any>>('GET', `/carts/${cart_id}`);
      expect(get.status).toBe(200);
      expect(get.json.success).toBe(true);
      expect((get.json as ApiSuccess<any>).data.cart_id).toBe(cart_id);

      const list = await requestJson<ApiResponse<any[]>>('GET', '/carts');
      expect(list.status).toBe(200);
      expect(list.json.success).toBe(true);
      expect((list.json as ApiSuccess<any[]>).data.length).toBe(1);

      const active = await requestJson<ApiResponse<any[]>>('GET', '/carts/active');
      expect(active.status).toBe(200);
      expect(active.json.success).toBe(true);
      expect((active.json as ApiSuccess<any[]>).data.length).toBe(1);

      const updatedQty = await requestJson<ApiResponse<any>>('PATCH', `/carts/${cart_id}/quantity`, {
        quantity: 2,
      });
      expect(updatedQty.status).toBe(200);
      expect(updatedQty.json.success).toBe(true);
      expect((updatedQty.json as ApiSuccess<any>).data.quantity).toBe(2);

      const removedCoupon = await requestJson<ApiResponse<any>>('PATCH', `/carts/${cart_id}/coupon`, {
        coupon_id: null,
      });
      expect(removedCoupon.status).toBe(200);
      expect(removedCoupon.json.success).toBe(true);
      expect((removedCoupon.json as ApiSuccess<any>).data.coupon_id).toBeNull();

      const reAdded = await requestJson<ApiResponse<any>>('PATCH', `/carts/${cart_id}/coupon`, {
        coupon_id,
      });
      expect(reAdded.status).toBe(200);
      expect(reAdded.json.success).toBe(true);
      expect((reAdded.json as ApiSuccess<any>).data.coupon_id).toBe(coupon_id);

      const checkout = await requestJson<ApiResponse<any>>('POST', `/carts/${cart_id}/checkout`);
      expect(checkout.status).toBe(201);
      expect(checkout.json.success).toBe(true);
      expect((checkout.json as ApiSuccess<any>).data.cart_id).toBe(cart_id);
      expect((checkout.json as ApiSuccess<any>).data.order_id).toBeGreaterThan(0);
      expect((checkout.json as ApiSuccess<any>).data.order_status).toBe('Pending');

      const invalidParam = await requestJson<ApiResponse<any>>('GET', '/carts/abc');
      expect(invalidParam.status).toBe(400);
      expect(invalidParam.json.success).toBe(false);
      expect((invalidParam.json as ApiFailure).code).toBe('VALIDATION_ERROR');

      const missingCart = await requestJson<ApiResponse<any>>('GET', '/carts/9999');
      expect(missingCart.status).toBe(404);
      expect(missingCart.json.success).toBe(false);
      expect((missingCart.json as ApiFailure).code).toBe('NOT_FOUND');
    });
  });

  it('orders routes: checkout-created order can be confirmed/completed; invalid transitions return 400', async () => {
    await withLock(async () => {
      resetSingletonDatabase();

      const { product_id } = await createProduct();
      const { cart_id } = await createCart({ product_id, quantity: 1 });

      const checkout = await requestJson<ApiResponse<any>>('POST', `/carts/${cart_id}/checkout`);
      expect(checkout.status).toBe(201);
      expect(checkout.json.success).toBe(true);
      const orderId = (checkout.json as ApiSuccess<any>).data.order_id as number;

      const prematureComplete = await requestJson<ApiResponse<any>>('POST', `/orders/${orderId}/complete`);
      expect(prematureComplete.status).toBe(400);
      expect(prematureComplete.json.success).toBe(false);
      expect((prematureComplete.json as ApiFailure).code).toBeUndefined();

      const confirmed = await requestJson<ApiResponse<any>>('POST', `/orders/${orderId}/confirm`);
      expect(confirmed.status).toBe(200);
      expect(confirmed.json.success).toBe(true);
      expect((confirmed.json as ApiSuccess<any>).data.status).toBe('Confirmed');

      const completed = await requestJson<ApiResponse<any>>('POST', `/orders/${orderId}/complete`);
      expect(completed.status).toBe(200);
      expect(completed.json.success).toBe(true);
      expect((completed.json as ApiSuccess<any>).data.status).toBe('Completed');

      const cancelAfterComplete = await requestJson<ApiResponse<any>>('POST', `/orders/${orderId}/cancel`);
      expect(cancelAfterComplete.status).toBe(400);
      expect(cancelAfterComplete.json.success).toBe(false);
      expect((cancelAfterComplete.json as ApiFailure).code).toBeUndefined();
    });
  });

  it('payments routes: create/complete/refund + duplicate create + invalid transitions', async () => {
    await withLock(async () => {
      resetSingletonDatabase();

      const { product_id } = await createProduct();
      const { cart_id } = await createCart({ product_id, quantity: 1 });
      const checkout = await requestJson<ApiResponse<any>>('POST', `/carts/${cart_id}/checkout`);
      const orderId = (checkout.json as ApiSuccess<any>).data.order_id as number;

      await requestJson<ApiResponse<any>>('POST', `/orders/${orderId}/confirm`);

      const createdPayment = await requestJson<ApiResponse<any>>('POST', '/payments', {
        order_id: orderId,
        amount: 100,
      });
      expect(createdPayment.status).toBe(201);
      expect(createdPayment.json.success).toBe(true);
      const paymentId = (createdPayment.json as ApiSuccess<any>).data.payment_id as number;

      const duplicate = await requestJson<ApiResponse<any>>('POST', '/payments', {
        order_id: orderId,
        amount: 100,
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.json.success).toBe(false);
      expect((duplicate.json as ApiFailure).code).toBe('CONFLICT');

      const refundPending = await requestJson<ApiResponse<any>>('POST', `/payments/${paymentId}/refund`);
      expect(refundPending.status).toBe(400);
      expect(refundPending.json.success).toBe(false);
      expect((refundPending.json as ApiFailure).code).toBeUndefined();

      const completed = await requestJson<ApiResponse<any>>('POST', `/payments/${paymentId}/complete`);
      expect(completed.status).toBe(200);
      expect(completed.json.success).toBe(true);
      expect((completed.json as ApiSuccess<any>).data.status).toBe('Completed');

      const refunded = await requestJson<ApiResponse<any>>('POST', `/payments/${paymentId}/refund`);
      expect(refunded.status).toBe(200);
      expect(refunded.json.success).toBe(true);
      expect((refunded.json as ApiSuccess<any>).data.status).toBe('Refunded');

      const list = await requestJson<ApiResponse<any[]>>('GET', '/payments');
      expect(list.status).toBe(200);
      expect(list.json.success).toBe(true);
      expect((list.json as ApiSuccess<any[]>).data.length).toBe(1);
    });
  });
});


