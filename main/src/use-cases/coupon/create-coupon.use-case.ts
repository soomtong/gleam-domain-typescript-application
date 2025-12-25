import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CouponRepository } from '@main/db/repositories/coupon.repository';
import { ConflictError, ValidationError } from '@main/use-cases/app-errors';
import { parseDateTimeToMillis } from '@main/use-cases/_datetime';

import type { CreateCouponRequest } from '@main/api/dto/coupon.dto';

import * as couponDomain from '@core/domain/coupon';

export class CreateCouponUseCase {
  private readonly repository: CouponRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new CouponRepository(db);
  }

  execute(request: CreateCouponRequest): couponDomain.Coupon$ {
    if (!request.code || !request.discount_type || request.discount_value <= 0) {
      throw new ValidationError('Invalid request: code is required, discount_value must be positive');
    }

    if (request.discount_type === 'Percentage' && request.discount_value > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100');
    }

    const existing = this.repository.findByCode(request.code);
    if (existing) {
      throw new ConflictError('Coupon code already exists');
    }

    return this.repository.create({
      ...request,
      valid_from: parseDateTimeToMillis(request.valid_from, 'valid_from'),
      valid_until: parseDateTimeToMillis(request.valid_until, 'valid_until'),
    });
  }
}


