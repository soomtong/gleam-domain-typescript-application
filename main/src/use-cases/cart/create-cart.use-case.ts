import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CartRepository } from '@main/db/repositories/cart.repository';
import { ProductRepository } from '@main/db/repositories/product.repository';
import { CouponRepository } from '@main/db/repositories/coupon.repository';
import { couponStatusToString } from '@main/domain/core-domain';
import { NotFoundError, ValidationError } from '@main/use-cases/app-errors';
import { parseDateTimeToMillis } from '@main/use-cases/_datetime';

import type { CreateCartRequest } from '@main/api/dto/cart.dto';

import * as couponDomain from '@core/domain/coupon';
import * as productDomain from '@core/domain/product';
import * as cartDomain from '@core/domain/cart';

export class CreateCartUseCase {
  private readonly cartRepository: CartRepository;
  private readonly productRepository: ProductRepository;
  private readonly couponRepository: CouponRepository;

  constructor(db: Database = getDatabase()) {
    this.cartRepository = new CartRepository(db);
    this.productRepository = new ProductRepository(db);
    this.couponRepository = new CouponRepository(db);
  }

  execute(request: CreateCartRequest): cartDomain.Cart$ {
    if (!request.product_id) {
      throw new ValidationError('Invalid request: product_id is required');
    }
    if (!request.quantity || request.quantity <= 0) {
      throw new ValidationError('Invalid request: quantity must be positive');
    }

    const product = this.productRepository.findById(request.product_id);
    if (!product) throw new NotFoundError('Product not found');

    if (productDomain.stock(product) < request.quantity) {
      throw new ValidationError(`Insufficient stock. Available: ${productDomain.stock(product)}`);
    }

    const coupon_id = request.coupon_id ?? null;
    if (coupon_id !== null && coupon_id !== undefined) {
      const coupon = this.couponRepository.findById(coupon_id);
      if (!coupon) throw new NotFoundError('Coupon not found');

      const status = couponStatusToString(couponDomain.status(coupon));
      if (status !== 'Active' || !couponDomain.is_valid(coupon)) {
        throw new ValidationError(`Coupon is ${status.toLowerCase()}`);
      }
    }

    const now = new Date();
    const nowMillis = now.getTime();
    const expired_at =
      request.expired_at !== undefined && request.expired_at !== null
        ? parseDateTimeToMillis(request.expired_at, 'expired_at')
        : nowMillis + 30 * 60000;
    const keep_until =
      request.keep_until !== undefined && request.keep_until !== null
        ? parseDateTimeToMillis(request.keep_until, 'keep_until')
        : nowMillis + 24 * 60 * 60000;

    return this.cartRepository.create({
      product_id: request.product_id,
      coupon_id: coupon_id ?? null,
      quantity: request.quantity,
      expired_at,
      keep_until,
    });
  }
}


