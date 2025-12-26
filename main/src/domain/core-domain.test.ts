import { describe, expect, it } from 'bun:test';

import { Ok, Error as GleamError, type Result } from '@core/domain/gleam';
import { None } from '@core/domain/option';

import * as productDomain from '@core/domain/product';
import * as couponDomain from '@core/domain/coupon';
import * as orderDomain from '@core/domain/order';
import * as paymentDomain from '@core/domain/payment';

function unwrapOk<T, E>(result: Result<T, E>): T {
  if (result instanceof Ok) return result[0];
  throw new Error(`Expected Ok but got Error: ${(result as any)[0]}`);
}

describe('Gleam domain integration (core)', () => {
  it('product.decrease_stock should set status OutOfStock when stock reaches 0', () => {
    const product = unwrapOk(
      productDomain.create(
        1,
        'Test product',
        100,
        1,
        new Date('2000-01-01T00:00:00.000Z').getTime(),
        new Date('2100-01-01T00:00:00.000Z').getTime()
      )
    );

    const decreased = productDomain.decrease_stock(product, 1);
    expect(decreased).toBeInstanceOf(Ok);

    const updated = (decreased as any)[0] as productDomain.Product$;
    expect(productDomain.stock(updated)).toBe(0);
    expect(productDomain.status(updated)).toBeInstanceOf(productDomain.OutOfStock);
  });

  it('coupon.calculate_discount should truncate percentage discounts and cap fixed discounts', () => {
    const couponPercentage = unwrapOk(
      couponDomain.create(
        1,
        'P15',
        new couponDomain.Percentage(15),
        15,
        new Date('2000-01-01T00:00:00.000Z').getTime(),
        new Date('2100-01-01T00:00:00.000Z').getTime()
      )
    );

    expect(couponDomain.calculate_discount(couponPercentage, 99)).toBe(14);

    const couponFixed = unwrapOk(
      couponDomain.create(
        2,
        'F150',
        new couponDomain.Fixed(150),
        150,
        new Date('2000-01-01T00:00:00.000Z').getTime(),
        new Date('2100-01-01T00:00:00.000Z').getTime()
      )
    );

    expect(couponDomain.calculate_discount(couponFixed, 100)).toBe(100);
  });

  it('order/payment status transitions should be enforced by the domain', () => {
    const order = unwrapOk(orderDomain.create(1, 1, 1, new None(), 1, 100, 0));
    const confirmed = unwrapOk(orderDomain.confirm(order));
    const completed = unwrapOk(orderDomain.complete(confirmed));

    const confirmCompleted = orderDomain.confirm(completed);
    expect(confirmCompleted).toBeInstanceOf(GleamError);
    expect((confirmCompleted as any)[0].message).toBe('Cannot confirm completed order');

    const payment = unwrapOk(paymentDomain.create(1, 1, 100));
    const failed = unwrapOk(paymentDomain.fail(payment));
    const completeFailed = paymentDomain.complete(failed);
    expect(completeFailed).toBeInstanceOf(GleamError);
    expect((completeFailed as any)[0].message).toBe('Cannot complete failed payment');
  });
});


