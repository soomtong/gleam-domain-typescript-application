import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '../_test-helpers';
import { ConflictError, NotFoundError, ValidationError } from '../app-errors';
import { CreatePaymentUseCase } from './create-payment.use-case';

import { CartRepository } from '../../db/repositories/cart.repository';
import { OrderRepository } from '../../db/repositories/order.repository';
import { PaymentRepository } from '../../db/repositories/payment.repository';
import { ProductRepository } from '../../db/repositories/product.repository';

import * as cartDomain from '@core/domain/cart';
import * as orderDomain from '@core/domain/order';
import * as paymentDomain from '@core/domain/payment';
import * as productDomain from '@core/domain/product';

describe('CreatePaymentUseCase', () => {
  it('creates a payment when order is confirmed and no payment exists', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const orderRepo = new OrderRepository(db);

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

    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: cartDomain.product_id(cart),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });
    const confirmed = orderRepo.updateStatus(orderDomain.order_id(order), 'Confirmed');
    expect(confirmed).not.toBeNull();

    const useCase = new CreatePaymentUseCase(db);
    const payment = useCase.execute({ order_id: orderDomain.order_id(order), amount: 100 });

    expect(paymentDomain.order_id(payment)).toBe(orderDomain.order_id(order));
    expect(paymentDomain.amount(payment)).toBe(100);
  });

  it('throws NotFoundError when order does not exist', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreatePaymentUseCase(db);

    expect(() => useCase.execute({ order_id: 9999, amount: 100 })).toThrow(NotFoundError);
  });

  it('throws ValidationError when order is not confirmed', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const orderRepo = new OrderRepository(db);

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

    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: cartDomain.product_id(cart),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    const useCase = new CreatePaymentUseCase(db);
    expect(() => useCase.execute({ order_id: orderDomain.order_id(order), amount: 100 })).toThrow(
      ValidationError
    );
  });

  it('throws ConflictError when payment already exists for the order', () => {
    const db = createInMemoryDatabase();
    const productRepo = new ProductRepository(db);
    const cartRepo = new CartRepository(db);
    const orderRepo = new OrderRepository(db);
    const paymentRepo = new PaymentRepository(db);

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

    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: cartDomain.product_id(cart),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });
    orderRepo.updateStatus(orderDomain.order_id(order), 'Confirmed');

    paymentRepo.create({ order_id: orderDomain.order_id(order), amount: 100 });

    const useCase = new CreatePaymentUseCase(db);
    expect(() => useCase.execute({ order_id: orderDomain.order_id(order), amount: 100 })).toThrow(
      ConflictError
    );
  });
});


