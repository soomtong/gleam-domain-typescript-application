import { Ok, Error as GleamError, type Result } from '@core/domain/gleam';
import { Some, None, type Option$ } from '@core/domain/option';

import * as productDomain from '@core/domain/product';
import * as couponDomain from '@core/domain/coupon';
import * as cartDomain from '@core/domain/cart';
import * as orderDomain from '@core/domain/order';
import * as paymentDomain from '@core/domain/payment';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result instanceof Ok) {
    return result[0];
  }

  if (result instanceof GleamError) {
    const errorValue: unknown = (result as any)[0];
    if (typeof errorValue === 'string') {
      throw new DomainError(errorValue);
    }

    const errorMessageProperty = (errorValue as any)?.message;
    if (typeof errorMessageProperty === 'string') {
      throw new DomainError(errorMessageProperty);
    }

    const errorMessageCandidate = (errorValue as any)?.[0];
    if (typeof errorMessageCandidate === 'string') {
      throw new DomainError(errorMessageCandidate);
    }

    throw new DomainError('Unknown domain error');
  }

  throw new Error('Unexpected domain result');
}

export function optionFromNullableInt(value: number | null | undefined): Option$<number> {
  return value === null || value === undefined ? new None() : new Some(value);
}

export function nullableIntFromOption(option: Option$<number>): number | null {
  return option instanceof Some ? option[0] : null;
}

export type ProductStatusString = 'Active' | 'Inactive' | 'OutOfStock';

export function productStatusFromString(
  status: ProductStatusString
): productDomain.ProductStatus$ {
  switch (status) {
    case 'Active':
      return new productDomain.Active();
    case 'Inactive':
      return new productDomain.Inactive();
    case 'OutOfStock':
      return new productDomain.OutOfStock();
  }
}

export function productStatusToString(
  status: productDomain.ProductStatus$
): ProductStatusString {
  if (status instanceof productDomain.Active) return 'Active';
  if (status instanceof productDomain.Inactive) return 'Inactive';
  if (status instanceof productDomain.OutOfStock) return 'OutOfStock';
  throw new Error('Unknown ProductStatus');
}

export type CouponStatusString = 'Active' | 'Inactive' | 'Expired';

export function couponStatusFromString(status: CouponStatusString): couponDomain.CouponStatus$ {
  switch (status) {
    case 'Active':
      return new couponDomain.Active();
    case 'Inactive':
      return new couponDomain.Inactive();
    case 'Expired':
      return new couponDomain.Expired();
  }
}

export function couponStatusToString(status: couponDomain.CouponStatus$): CouponStatusString {
  if (status instanceof couponDomain.Active) return 'Active';
  if (status instanceof couponDomain.Inactive) return 'Inactive';
  if (status instanceof couponDomain.Expired) return 'Expired';
  throw new Error('Unknown CouponStatus');
}

export type DiscountTypeString = 'Percentage' | 'Fixed';

export function discountTypeFromDb(
  discount_type: DiscountTypeString,
  discount_value: number
): couponDomain.DiscountType$ {
  return discount_type === 'Percentage'
    ? new couponDomain.Percentage(discount_value)
    : new couponDomain.Fixed(discount_value);
}

export function discountTypeToString(discountType: couponDomain.DiscountType$): DiscountTypeString {
  if (discountType instanceof couponDomain.Percentage) return 'Percentage';
  if (discountType instanceof couponDomain.Fixed) return 'Fixed';
  throw new Error('Unknown DiscountType');
}

export function discountValueFromDiscountType(discountType: couponDomain.DiscountType$): number {
  if (discountType instanceof couponDomain.Percentage) return discountType[0];
  if (discountType instanceof couponDomain.Fixed) return discountType[0];
  throw new Error('Unknown DiscountType');
}

export type CartStatusString = 'Active' | 'Expired' | 'CheckedOut';

export function cartStatusFromString(status: CartStatusString): cartDomain.CartStatus$ {
  switch (status) {
    case 'Active':
      return new cartDomain.Active();
    case 'Expired':
      return new cartDomain.Expired();
    case 'CheckedOut':
      return new cartDomain.CheckedOut();
  }
}

export function cartStatusToString(status: cartDomain.CartStatus$): CartStatusString {
  if (status instanceof cartDomain.Active) return 'Active';
  if (status instanceof cartDomain.Expired) return 'Expired';
  if (status instanceof cartDomain.CheckedOut) return 'CheckedOut';
  throw new Error('Unknown CartStatus');
}

export type OrderStatusString = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

export function orderStatusFromString(status: OrderStatusString): orderDomain.OrderStatus$ {
  switch (status) {
    case 'Pending':
      return new orderDomain.Pending();
    case 'Confirmed':
      return new orderDomain.Confirmed();
    case 'Cancelled':
      return new orderDomain.Cancelled();
    case 'Completed':
      return new orderDomain.Completed();
  }
}

export function orderStatusToString(status: orderDomain.OrderStatus$): OrderStatusString {
  if (status instanceof orderDomain.Pending) return 'Pending';
  if (status instanceof orderDomain.Confirmed) return 'Confirmed';
  if (status instanceof orderDomain.Cancelled) return 'Cancelled';
  if (status instanceof orderDomain.Completed) return 'Completed';
  throw new Error('Unknown OrderStatus');
}

export type PaymentStatusString = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

export function paymentStatusFromString(status: PaymentStatusString): paymentDomain.PaymentStatus$ {
  switch (status) {
    case 'Pending':
      return new paymentDomain.Pending();
    case 'Completed':
      return new paymentDomain.Completed();
    case 'Failed':
      return new paymentDomain.Failed();
    case 'Refunded':
      return new paymentDomain.Refunded();
  }
}

export function paymentStatusToString(status: paymentDomain.PaymentStatus$): PaymentStatusString {
  if (status instanceof paymentDomain.Pending) return 'Pending';
  if (status instanceof paymentDomain.Completed) return 'Completed';
  if (status instanceof paymentDomain.Failed) return 'Failed';
  if (status instanceof paymentDomain.Refunded) return 'Refunded';
  throw new Error('Unknown PaymentStatus');
}
