import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { CartRepository } from '../../db/repositories/cart.repository';
import { CouponRepository } from '../../db/repositories/coupon.repository';
import { couponStatusToString } from '../../domain/core-domain';
import { NotFoundError, ValidationError } from '../app-errors';

import type { UpdateCartCouponRequest } from '../../api/dto/cart.dto';

import * as couponDomain from '@core/domain/coupon';
import * as cartDomain from '@core/domain/cart';

export class UpdateCartCouponUseCase {
  private readonly cartRepository: CartRepository;
  private readonly couponRepository: CouponRepository;

  constructor(db: Database = getDatabase()) {
    this.cartRepository = new CartRepository(db);
    this.couponRepository = new CouponRepository(db);
  }

  execute(cart_id: number, request: UpdateCartCouponRequest): cartDomain.Cart$ {
    const existingCart = this.cartRepository.findById(cart_id);
    if (!existingCart) throw new NotFoundError('Cart not found');

    const coupon_id = request.coupon_id ?? null;
    if (coupon_id !== null) {
      const coupon = this.couponRepository.findById(coupon_id);
      if (!coupon) throw new NotFoundError('Coupon not found');

      const status = couponStatusToString(couponDomain.status(coupon));
      if (status !== 'Active' || !couponDomain.is_valid(coupon)) {
        throw new ValidationError(`Coupon is ${status.toLowerCase()}`);
      }
    }

    const updated = this.cartRepository.updateCoupon(cart_id, coupon_id);
    if (!updated) throw new NotFoundError('Cart not found');
    return updated;
  }
}


