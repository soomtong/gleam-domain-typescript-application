import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CouponRepository } from '@main/db/repositories/coupon.repository';

import * as couponDomain from '@core/domain/coupon';

export class ListActiveCouponsUseCase {
  private readonly repository: CouponRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new CouponRepository(db);
  }

  execute(): couponDomain.Coupon$[] {
    return this.repository.findActive();
  }
}


