import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '@main/use-cases/_test-helpers';
import { NotFoundError } from '@main/use-cases/app-errors';
import { DomainError, orderStatusToString, paymentStatusToString } from '@main/domain/core-domain';

import { CartRepository } from '@main/db/repositories/cart.repository';
import { OrderRepository } from '@main/db/repositories/order.repository';
import { PaymentRepository } from '@main/db/repositories/payment.repository';
import { ProductRepository } from '@main/db/repositories/product.repository';

import { CompletePaymentUseCase } from './complete-payment.use-case';
import { FailPaymentUseCase } from './fail-payment.use-case';
import { GetPaymentUseCase } from './get-payment.use-case';
import { ListPaymentsUseCase } from './list-payments.use-case';
import { RefundPaymentUseCase } from './refund-payment.use-case';

import * as cartDomain from '@core/domain/cart';
import * as orderDomain from '@core/domain/order';
import * as paymentDomain from '@core/domain/payment';
import * as productDomain from '@core/domain/product';

function seedOrderAndPayment(db: any) {
  const productRepo = new ProductRepository(db);
  const cartRepo = new CartRepository(db);
  const orderRepo = new OrderRepository(db);
  const paymentRepo = new PaymentRepository(db);

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
  orderRepo.updateStatus(orderDomain.order_id(order), 'Confirmed');

  const payment = paymentRepo.create({ order_id: orderDomain.order_id(order), amount: 100 });
  return { orderRepo, paymentRepo, order, payment };
}

describe('Payment use-cases (additional)', () => {
  it('GetPaymentUseCase returns payment or throws NotFoundError', () => {
    const db = createInMemoryDatabase();
    const { payment } = seedOrderAndPayment(db);

    const useCase = new GetPaymentUseCase(db);
    const fetched = useCase.execute(paymentDomain.payment_id(payment));
    expect(paymentDomain.payment_id(fetched)).toBe(paymentDomain.payment_id(payment));

    expect(() => useCase.execute(9999)).toThrow(NotFoundError);
  });

  it('ListPaymentsUseCase lists all payments', () => {
    const db = createInMemoryDatabase();
    seedOrderAndPayment(db);

    const payments = new ListPaymentsUseCase(db).execute();
    expect(payments.length).toBe(1);
  });

  it('CompletePaymentUseCase completes payment and attempts to complete order', () => {
    const db = createInMemoryDatabase();
    const { orderRepo, paymentRepo, order, payment } = seedOrderAndPayment(db);

    const completedPayment = new CompletePaymentUseCase(db).execute(paymentDomain.payment_id(payment));
    expect(paymentStatusToString(paymentDomain.status(completedPayment))).toBe('Completed');

    const persistedPayment = paymentRepo.findById(paymentDomain.payment_id(payment));
    expect(persistedPayment).not.toBeNull();
    expect(paymentStatusToString(paymentDomain.status(persistedPayment!))).toBe('Completed');

    const persistedOrder = orderRepo.findById(orderDomain.order_id(order));
    expect(persistedOrder).not.toBeNull();
    expect(orderStatusToString(orderDomain.status(persistedOrder!))).toBe('Completed');
  });

  it('FailPaymentUseCase fails payment; RefundPaymentUseCase refunds a completed payment', () => {
    const db = createInMemoryDatabase();
    const { paymentRepo, payment } = seedOrderAndPayment(db);

    const failed = new FailPaymentUseCase(db).execute(paymentDomain.payment_id(payment));
    expect(paymentStatusToString(paymentDomain.status(failed))).toBe('Failed');

    const another = paymentRepo.create({ order_id: paymentDomain.order_id(payment), amount: 100 });
    new CompletePaymentUseCase(db).execute(paymentDomain.payment_id(another));

    const refunded = new RefundPaymentUseCase(db).execute(paymentDomain.payment_id(another));
    expect(paymentStatusToString(paymentDomain.status(refunded))).toBe('Refunded');
  });

  it('throws NotFoundError for missing payment ids', () => {
    const db = createInMemoryDatabase();
    expect(() => new CompletePaymentUseCase(db).execute(9999)).toThrow(NotFoundError);
    expect(() => new FailPaymentUseCase(db).execute(9999)).toThrow(NotFoundError);
    expect(() => new RefundPaymentUseCase(db).execute(9999)).toThrow(NotFoundError);
  });

  it('enforces valid payment status transitions via domain (invalid transitions throw DomainError)', () => {
    const db = createInMemoryDatabase();
    const { paymentRepo, payment } = seedOrderAndPayment(db);

    // Pending -> Refunded is invalid
    expect(() => new RefundPaymentUseCase(db).execute(paymentDomain.payment_id(payment))).toThrow(DomainError);

    // Pending -> Failed is valid, but Failed -> Completed is invalid
    const failed = new FailPaymentUseCase(db).execute(paymentDomain.payment_id(payment));
    expect(paymentStatusToString(paymentDomain.status(failed))).toBe('Failed');
    expect(() => new CompletePaymentUseCase(db).execute(paymentDomain.payment_id(failed))).toThrow(DomainError);

    // Create another payment row for an independent invalid transition: Completed -> Failed is invalid
    const another = paymentRepo.create({ order_id: paymentDomain.order_id(payment), amount: 100 });
    const completed = new CompletePaymentUseCase(db).execute(paymentDomain.payment_id(another));
    expect(paymentStatusToString(paymentDomain.status(completed))).toBe('Completed');
    expect(() => new FailPaymentUseCase(db).execute(paymentDomain.payment_id(completed))).toThrow(DomainError);
  });
});


