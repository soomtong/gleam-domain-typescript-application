import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CouponRepository } from '@main/db/repositories/coupon.repository';
import { couponStatusToString } from '@main/domain/core-domain';
import { NotFoundError, ValidationError } from '@main/use-cases/app-errors';

import * as couponDomain from '@core/domain/coupon';

export interface CouponDiscountCalculation {
  original_price: number;
  discount_amount: number;
  final_price: number;
  coupon_code: string;
}

export class CalculateCouponDiscountUseCase {
  private readonly repository: CouponRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new CouponRepository(db);
  }

  execute(code: string, original_price: number): CouponDiscountCalculation {
    if (original_price === undefined || original_price === null || original_price < 0) {
      throw new ValidationError('Invalid original_price');
    }

    const coupon = this.repository.findByCode(code);
    if (!coupon) throw new NotFoundError('Coupon not found');

    const status = couponStatusToString(couponDomain.status(coupon));
    if (status !== 'Active' || !couponDomain.is_valid(coupon)) {
      throw new ValidationError(`Coupon is ${status.toLowerCase()}`);
    }

    const discount_amount = couponDomain.calculate_discount(coupon, original_price);
    const final_price = original_price - discount_amount;

    return {
      original_price,
      discount_amount,
      final_price,
      coupon_code: couponDomain.code(coupon),
    };
  }
}


