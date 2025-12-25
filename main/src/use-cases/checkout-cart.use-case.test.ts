import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '@main/use-cases/_test-helpers';
import { CheckoutCartUseCase } from '@main/use-cases/checkout-cart.use-case';
import { CartRepository } from '@main/db/repositories/cart.repository';
import { CouponRepository } from '@main/db/repositories/coupon.repository';
import { ProductRepository } from '@main/db/repositories/product.repository';
import { OrderRepository } from '@main/db/repositories/order.repository';
import { DomainError, cartStatusToString, orderStatusToString } from '@main/domain/core-domain';
import { NotFoundError } from '@main/use-cases/app-errors';

import * as cartDomain from '@core/domain/cart';
import * as productDomain from '@core/domain/product';
import * as orderDomain from '@core/domain/order';
import * as couponDomain from '@core/domain/coupon';

describe('CheckoutCartUseCase', () => {
  it('checks out cart atomically: decreases stock, creates order, marks cart checked out', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const orderRepo = new OrderRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 5,
      begin_at: '2000-01-01T00:00:00.000Z',
      end_at: '2100-01-01T00:00:00.000Z',
    });

    const cart = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 2,
      expired_at: '2100-01-01T00:00:00.000Z',
      keep_until: '2100-01-02T00:00:00.000Z',
    });

    const useCase = new CheckoutCartUseCase(db);
    const result = useCase.execute(cartDomain.cart_id(cart));

    expect(result.cart_id).toBe(cartDomain.cart_id(cart));
    expect(result.product_id).toBe(productDomain.product_id(product));
    expect(result.quantity).toBe(2);
    expect(result.original_amount).toBe(200);
    expect(result.discount_amount).toBe(0);
    expect(result.paid_amount).toBe(200);

    const updatedProduct = productRepo.findById(productDomain.product_id(product));
    expect(updatedProduct).not.toBeNull();
    expect(productDomain.stock(updatedProduct!)).toBe(3);

    const updatedCart = cartRepo.findById(cartDomain.cart_id(cart));
    expect(updatedCart).not.toBeNull();
    expect(cartStatusToString(cartDomain.status(updatedCart!))).toBe('CheckedOut');

    const persistedOrder = orderRepo.findById(result.order.order_id);
    expect(persistedOrder).not.toBeNull();
    expect(orderDomain.cart_id(persistedOrder!)).toBe(cartDomain.cart_id(cart));
    expect(orderDomain.product_id(persistedOrder!)).toBe(productDomain.product_id(product));
    expect(orderStatusToString(orderDomain.status(persistedOrder!))).toBe('Pending');
  });

  it('throws NotFoundError when cart does not exist', () => {
    const db = createInMemoryDatabase();
    const useCase = new CheckoutCartUseCase(db);
    expect(() => useCase.execute(9999)).toThrow(NotFoundError);
  });

  it('throws DomainError when product is out of stock', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 0,
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

    const useCase = new CheckoutCartUseCase(db);
    expect(() => useCase.execute(cartDomain.cart_id(cart))).toThrow(DomainError);
  });

  it('throws DomainError when coupon is not active/valid and NotFoundError when coupon is missing', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const couponRepo = new CouponRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: '2000-01-01T00:00:00.000Z',
      end_at: '2100-01-01T00:00:00.000Z',
    });

    const now = Date.now();
    const expiredCoupon = couponRepo.create({
      code: 'EXPIRED',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      valid_until: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    });

    const cartWithExpiredCoupon = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: couponDomain.coupon_id(expiredCoupon),
      quantity: 1,
      expired_at: '2100-01-01T00:00:00.000Z',
      keep_until: '2100-01-02T00:00:00.000Z',
    });

    const useCase = new CheckoutCartUseCase(db);
    expect(() => useCase.execute(cartDomain.cart_id(cartWithExpiredCoupon))).toThrow(DomainError);

    const cartWithCoupon = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: couponDomain.coupon_id(expiredCoupon),
      quantity: 1,
      expired_at: '2100-01-01T00:00:00.000Z',
      keep_until: '2100-01-02T00:00:00.000Z',
    });

    // FK 때문에 존재하지 않는 coupon_id로 cart 생성이 불가능하므로, 테스트에서만 coupon_id를 강제로 깨뜨려 NotFound 케이스를 재현한다.
    db.run('PRAGMA foreign_keys = OFF');
    db.prepare('UPDATE carts SET coupon_id = ? WHERE cart_id = ?').run(9999, cartDomain.cart_id(cartWithCoupon));
    db.run('PRAGMA foreign_keys = ON');

    expect(() => useCase.execute(cartDomain.cart_id(cartWithCoupon))).toThrow(NotFoundError);
  });
});


