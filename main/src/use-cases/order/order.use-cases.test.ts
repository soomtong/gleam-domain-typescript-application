import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '../_test-helpers';
import { NotFoundError, ValidationError } from '../app-errors';
import { DomainError, orderStatusToString } from '../../domain/core-domain';

import { CartRepository } from '../../db/repositories/cart.repository';
import { OrderRepository } from '../../db/repositories/order.repository';
import { ProductRepository } from '../../db/repositories/product.repository';

import { CancelOrderUseCase } from './cancel-order.use-case';
import { CompleteOrderUseCase } from './complete-order.use-case';
import { ConfirmOrderUseCase } from './confirm-order.use-case';
import { CreateOrderUseCase } from './create-order.use-case';
import { GetOrderUseCase } from './get-order.use-case';
import { ListOrdersUseCase } from './list-orders.use-case';

import * as cartDomain from '@core/domain/cart';
import * as orderDomain from '@core/domain/order';
import * as productDomain from '@core/domain/product';

function seedCartAndProduct(db: any) {
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

  return { product, cart };
}

describe('Order use-cases', () => {
  it('CreateOrderUseCase validates request shape', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreateOrderUseCase(db);

    expect(() =>
      useCase.execute({
        // @ts-expect-error negative test
        cart_id: '1',
        product_id: 1,
        quantity: 1,
        paid_amount: 100,
        discount_amount: 0,
      })
    ).toThrow(ValidationError);
  });

  it('CreateOrderUseCase creates an order with Pending status', () => {
    const db = createInMemoryDatabase();
    const { product, cart } = seedCartAndProduct(db);
    const useCase = new CreateOrderUseCase(db);

    const order = useCase.execute({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    expect(orderDomain.order_id(order)).toBeGreaterThan(0);
    expect(orderStatusToString(orderDomain.status(order))).toBe('Pending');
  });

  it('GetOrderUseCase returns order or throws NotFoundError', () => {
    const db = createInMemoryDatabase();
    const { product, cart } = seedCartAndProduct(db);
    const orderRepo = new OrderRepository(db);
    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    const useCase = new GetOrderUseCase(db);
    expect(orderDomain.order_id(useCase.execute(orderDomain.order_id(order)))).toBe(orderDomain.order_id(order));
    expect(() => useCase.execute(9999)).toThrow(NotFoundError);
  });

  it('ListOrdersUseCase lists all orders', () => {
    const db = createInMemoryDatabase();
    const { product, cart } = seedCartAndProduct(db);
    const orderRepo = new OrderRepository(db);
    orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    const orders = new ListOrdersUseCase(db).execute();
    expect(orders.length).toBe(1);
  });

  it('ConfirmOrderUseCase and CancelOrderUseCase update status', () => {
    const db = createInMemoryDatabase();
    const { product, cart } = seedCartAndProduct(db);
    const orderRepo = new OrderRepository(db);
    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    const confirmed = new ConfirmOrderUseCase(db).execute(orderDomain.order_id(order));
    expect(orderStatusToString(orderDomain.status(confirmed))).toBe('Confirmed');

    const cancelled = new CancelOrderUseCase(db).execute(orderDomain.order_id(order));
    expect(orderStatusToString(orderDomain.status(cancelled))).toBe('Cancelled');

    expect(() => new ConfirmOrderUseCase(db).execute(9999)).toThrow(NotFoundError);
  });

  it('CompleteOrderUseCase enforces valid status transitions via domain', () => {
    const db = createInMemoryDatabase();
    const { product, cart } = seedCartAndProduct(db);
    const orderRepo = new OrderRepository(db);
    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    expect(() => new CompleteOrderUseCase(db).execute(orderDomain.order_id(order))).toThrow(DomainError);

    new ConfirmOrderUseCase(db).execute(orderDomain.order_id(order));
    const completed = new CompleteOrderUseCase(db).execute(orderDomain.order_id(order));
    expect(orderStatusToString(orderDomain.status(completed))).toBe('Completed');
  });

  it('enforces invalid order status transitions via domain (invalid transitions throw DomainError)', () => {
    const db = createInMemoryDatabase();
    const { product, cart } = seedCartAndProduct(db);
    const orderRepo = new OrderRepository(db);
    const order = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });

    // Pending -> Cancelled is valid, but Cancelled -> Confirmed is invalid
    const cancelled = new CancelOrderUseCase(db).execute(orderDomain.order_id(order));
    expect(orderStatusToString(orderDomain.status(cancelled))).toBe('Cancelled');
    expect(() => new ConfirmOrderUseCase(db).execute(orderDomain.order_id(order))).toThrow(DomainError);

    // Confirmed -> Completed is valid, but Completed -> Cancelled is invalid
    const another = orderRepo.create({
      cart_id: cartDomain.cart_id(cart),
      product_id: productDomain.product_id(product),
      coupon_id: null,
      quantity: 1,
      paid_amount: 100,
      discount_amount: 0,
    });
    new ConfirmOrderUseCase(db).execute(orderDomain.order_id(another));
    const completed = new CompleteOrderUseCase(db).execute(orderDomain.order_id(another));
    expect(orderStatusToString(orderDomain.status(completed))).toBe('Completed');
    expect(() => new CancelOrderUseCase(db).execute(orderDomain.order_id(another))).toThrow(DomainError);
  });
});


