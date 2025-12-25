import type { Cart$ as Cart } from '@core/domain/cart';
import * as cartDomain from '@core/domain/cart';

import { cartStatusToString, nullableIntFromOption } from '../../domain/core-domain';

export interface CreateCartRequest {
  product_id: number;
  coupon_id?: number | null;
  quantity: number;
  expired_at?: string;
  keep_until?: string;
}

export interface UpdateCartCouponRequest {
  coupon_id: number | null;
}

export interface UpdateCartQuantityRequest {
  quantity: number;
}

export interface CartResponse {
  cart_id: number;
  product_id: number;
  coupon_id: number | null;
  quantity: number;
  expired_at: string;
  keep_until: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function toCartResponse(cart: Cart): CartResponse {
  return {
    cart_id: cartDomain.cart_id(cart),
    product_id: cartDomain.product_id(cart),
    coupon_id: nullableIntFromOption(cartDomain.coupon_id(cart)),
    quantity: cartDomain.quantity(cart),
    expired_at: cartDomain.expired_at(cart),
    keep_until: cartDomain.keep_until(cart),
    status: cartStatusToString(cartDomain.status(cart)),
    created_at: cartDomain.created_at(cart),
    updated_at: cartDomain.updated_at(cart),
  };
}
