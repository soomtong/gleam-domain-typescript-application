import type { Coupon$ as Coupon } from '@core/domain/coupon';
import * as couponDomain from '@core/domain/coupon';

import {
  couponStatusToString,
  discountTypeToString,
  discountValueFromDiscountType,
  type DiscountTypeString,
} from '../../domain/core-domain';

export interface CreateCouponRequest {
  code: string;
  discount_type: DiscountTypeString;
  discount_value: number;
  valid_from: string;
  valid_until: string;
}

export interface CalculateDiscountRequest {
  original_price: number;
}

export interface CouponResponse {
  coupon_id: number;
  code: string;
  discount_type: DiscountTypeString;
  discount_value: number;
  valid_from: string;
  valid_until: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountCalculationResponse {
  original_price: number;
  discount_amount: number;
  final_price: number;
  coupon_code: string;
}

export function toCouponResponse(coupon: Coupon): CouponResponse {
  return {
    coupon_id: couponDomain.coupon_id(coupon),
    code: couponDomain.code(coupon),
    discount_type: discountTypeToString(couponDomain.discount_type(coupon)),
    discount_value: discountValueFromDiscountType(couponDomain.discount_type(coupon)),
    valid_from: couponDomain.valid_from(coupon),
    valid_until: couponDomain.valid_until(coupon),
    status: couponStatusToString(couponDomain.status(coupon)),
    created_at: couponDomain.created_at(coupon),
    updated_at: couponDomain.updated_at(coupon),
  };
}
