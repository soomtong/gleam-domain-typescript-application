import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '../_test-helpers';
import { NotFoundError, ValidationError } from '../app-errors';
import { cartStatusToString, nullableIntFromOption } from '../../domain/core-domain';

import { CartRepository } from '../../db/repositories/cart.repository';
import { CouponRepository } from '../../db/repositories/coupon.repository';
import { ProductRepository } from '../../db/repositories/product.repository';

import { CreateCartUseCase } from './create-cart.use-case';
import { GetCartUseCase } from './get-cart.use-case';
import { ListActiveCartsUseCase } from './list-active-carts.use-case';
import { ListCartsUseCase } from './list-carts.use-case';
import { UpdateCartCouponUseCase } from './update-cart-coupon.use-case';
import { UpdateCartQuantityUseCase } from './update-cart-quantity.use-case';

import * as cartDomain from '@core/domain/cart';
import * as couponDomain from '@core/domain/coupon';
import * as productDomain from '@core/domain/product';

describe('Cart use-cases', () => {
  it('CreateCartUseCase creates cart with valid product and optional coupon', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const couponRepo = new CouponRepository(db);

    const now = Date.now();
    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    const coupon = couponRepo.create({
      code: 'P10',
      discount_type: 'Percentage',
      discount_value: 10,
      valid_from: now - 24 * 60 * 60 * 1000,
      valid_until: now + 24 * 60 * 60 * 1000,
    });

    const useCase = new CreateCartUseCase(db);
    const cart = useCase.execute({
      product_id: productDomain.product_id(product),
      coupon_id: couponDomain.coupon_id(coupon),
      quantity: 2,
    });

    expect(cartDomain.cart_id(cart)).toBeGreaterThan(0);
    expect(cartDomain.product_id(cart)).toBe(productDomain.product_id(product));
    expect(nullableIntFromOption(cartDomain.coupon_id(cart))).toBe(couponDomain.coupon_id(coupon));
    expect(cartDomain.quantity(cart)).toBe(2);
    expect(cartStatusToString(cartDomain.status(cart))).toBe('Active');
  });

  it('CreateCartUseCase validates product_id and quantity', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreateCartUseCase(db);

    expect(() =>
      useCase.execute({
        // @ts-expect-error negative test
        product_id: undefined,
        quantity: 1,
      })
    ).toThrow(ValidationError);

    expect(() =>
      useCase.execute({
        product_id: 1,
        quantity: 0,
      })
    ).toThrow(ValidationError);
  });

  it('CreateCartUseCase throws for missing product, insufficient stock, and invalid coupon', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const couponRepo = new CouponRepository(db);
    const useCase = new CreateCartUseCase(db);

    expect(() =>
      useCase.execute({
        product_id: 9999,
        quantity: 1,
      })
    ).toThrow(NotFoundError);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 1,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    expect(() =>
      useCase.execute({
        product_id: productDomain.product_id(product),
        quantity: 2,
      })
    ).toThrow(ValidationError);

    const now = Date.now();
    const expiredCoupon = couponRepo.create({
      code: 'EXPIRED',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: now - 2 * 24 * 60 * 60 * 1000,
      valid_until: now - 24 * 60 * 60 * 1000,
    });

    expect(() =>
      useCase.execute({
        product_id: productDomain.product_id(product),
        coupon_id: couponDomain.coupon_id(expiredCoupon),
        quantity: 1,
      })
    ).toThrow(ValidationError);

    expect(() =>
      useCase.execute({
        product_id: productDomain.product_id(product),
        coupon_id: 9999,
        quantity: 1,
      })
    ).toThrow(NotFoundError);
  });

  it('GetCartUseCase returns cart or throws NotFoundError', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });
    const cart = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: Date.parse('2100-01-01T00:00:00.000Z'),
      keep_until: Date.parse('2100-01-02T00:00:00.000Z'),
    });

    const useCase = new GetCartUseCase(db);
    const fetched = useCase.execute(cartDomain.cart_id(cart));
    expect(cartDomain.cart_id(fetched)).toBe(cartDomain.cart_id(cart));

    expect(() => useCase.execute(9999)).toThrow(NotFoundError);
  });

  it('ListCartsUseCase lists all carts; ListActiveCartsUseCase filters out expired', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: Date.parse('2100-01-01T00:00:00.000Z'),
      keep_until: Date.parse('2100-01-02T00:00:00.000Z'),
    });
    cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: Date.parse('2000-01-01T00:00:00.000Z'),
      keep_until: Date.parse('2100-01-02T00:00:00.000Z'),
    });

    const all = new ListCartsUseCase(db).execute();
    expect(all.length).toBe(2);

    const active = new ListActiveCartsUseCase(db).execute();
    expect(active.length).toBe(1);
    expect(cartStatusToString(cartDomain.status(active[0]!))).toBe('Active');
  });

  it('UpdateCartQuantityUseCase validates quantity and checks stock', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 2,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });
    const cart = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: Date.parse('2100-01-01T00:00:00.000Z'),
      keep_until: Date.parse('2100-01-02T00:00:00.000Z'),
    });

    const useCase = new UpdateCartQuantityUseCase(db);
    expect(() => useCase.execute(cartDomain.cart_id(cart), { quantity: 0 })).toThrow(ValidationError);
    expect(() => useCase.execute(9999, { quantity: 1 })).toThrow(NotFoundError);
    expect(() => useCase.execute(cartDomain.cart_id(cart), { quantity: 3 })).toThrow(ValidationError);

    const updated = useCase.execute(cartDomain.cart_id(cart), { quantity: 2 });
    expect(cartDomain.quantity(updated)).toBe(2);
  });

  it('UpdateCartCouponUseCase adds and removes coupon, and validates coupon state', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const couponRepo = new CouponRepository(db);

    const product = productRepo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });
    const cart = cartRepo.create({
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      expired_at: Date.parse('2100-01-01T00:00:00.000Z'),
      keep_until: Date.parse('2100-01-02T00:00:00.000Z'),
    });

    const now = Date.now();
    const validCoupon = couponRepo.create({
      code: 'P10',
      discount_type: 'Percentage',
      discount_value: 10,
      valid_from: now - 24 * 60 * 60 * 1000,
      valid_until: now + 24 * 60 * 60 * 1000,
    });
    const expiredCoupon = couponRepo.create({
      code: 'EXPIRED',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: now - 2 * 24 * 60 * 60 * 1000,
      valid_until: now - 24 * 60 * 60 * 1000,
    });

    const useCase = new UpdateCartCouponUseCase(db);

    expect(() => useCase.execute(9999, { coupon_id: null })).toThrow(NotFoundError);
    expect(() => useCase.execute(cartDomain.cart_id(cart), { coupon_id: 9999 })).toThrow(NotFoundError);
    expect(() =>
      useCase.execute(cartDomain.cart_id(cart), { coupon_id: couponDomain.coupon_id(expiredCoupon) })
    ).toThrow(ValidationError);

    const added = useCase.execute(cartDomain.cart_id(cart), { coupon_id: couponDomain.coupon_id(validCoupon) });
    expect(nullableIntFromOption(cartDomain.coupon_id(added))).toBe(couponDomain.coupon_id(validCoupon));

    const removed = useCase.execute(cartDomain.cart_id(cart), { coupon_id: null });
    expect(nullableIntFromOption(cartDomain.coupon_id(removed))).toBeNull();
  });
});


