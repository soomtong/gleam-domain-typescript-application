import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CouponRepository } from '@main/db/repositories/coupon.repository';
import { NotFoundError } from '@main/use-cases/app-errors';

import * as couponDomain from '@core/domain/coupon';

export class GetCouponByCodeUseCase {
  private readonly repository: CouponRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new CouponRepository(db);
  }

  execute(code: string): couponDomain.Coupon$ {
    const coupon = this.repository.findByCode(code);
    if (!coupon) throw new NotFoundError('Coupon not found');
    return coupon;
  }
}


