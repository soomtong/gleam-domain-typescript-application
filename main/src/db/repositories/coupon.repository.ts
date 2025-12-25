import type { Database } from 'bun:sqlite';

import * as couponDomain from '@core/domain/coupon';

import {
  couponStatusFromString,
  couponStatusToString,
  discountTypeFromDb,
  discountTypeToString,
  discountValueFromDiscountType,
  unwrapResult,
  type CouponStatusString,
  type DiscountTypeString,
} from '../../domain/core-domain';

export class CouponRepository {
  constructor(private db: Database) {}

  create(data: {
    code: string;
    discount_type: DiscountTypeString;
    discount_value: number;
    valid_from: number;
    valid_until: number;
  }): couponDomain.Coupon$ {
    const discountType = discountTypeFromDb(data.discount_type, data.discount_value);
    const provisionalCoupon = unwrapResult(
      couponDomain.create(
        0,
        data.code,
        discountType,
        data.discount_value,
        data.valid_from,
        data.valid_until
      )
    );

    const status = couponStatusToString(couponDomain.status(provisionalCoupon));
    const storedDiscountType = discountTypeToString(couponDomain.discount_type(provisionalCoupon));
    const storedDiscountValue = discountValueFromDiscountType(couponDomain.discount_type(provisionalCoupon));

    const stmt = this.db.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      couponDomain.code(provisionalCoupon),
      storedDiscountType,
      storedDiscountValue,
      couponDomain.valid_from(provisionalCoupon),
      couponDomain.valid_until(provisionalCoupon),
      status,
      couponDomain.created_at(provisionalCoupon),
      couponDomain.updated_at(provisionalCoupon)
    );

    const coupon_id = Number(result.lastInsertRowid);
    return unwrapResult(couponDomain.assign_id(provisionalCoupon, coupon_id));
  }

  findById(coupon_id: number): couponDomain.Coupon$ | null {
    const stmt = this.db.prepare(`
      SELECT * FROM coupons WHERE coupon_id = ?
    `);

    const row = stmt.get(coupon_id) as any;
    return row ? this.mapToCoupon(row) : null;
  }

  findByCode(code: string): couponDomain.Coupon$ | null {
    const stmt = this.db.prepare(`
      SELECT * FROM coupons WHERE code = ?
    `);

    const row = stmt.get(code) as any;
    return row ? this.mapToCoupon(row) : null;
  }

  findAll(): couponDomain.Coupon$[] {
    const stmt = this.db.prepare(`
      SELECT * FROM coupons ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapToCoupon(row));
  }

  findActive(): couponDomain.Coupon$[] {
    return this.findAll().filter(coupon => couponStatusToString(couponDomain.status(coupon)) === 'Active');
  }

  updateStatus(coupon_id: number, status: CouponStatusString): couponDomain.Coupon$ | null {
    const existing = this.findById(coupon_id);
    if (!existing) return null;

    const updated = couponDomain.change_status(existing, couponStatusFromString(status));
    const stmt = this.db.prepare(`
      UPDATE coupons
      SET status = ?, updated_at = ?
      WHERE coupon_id = ?
    `);

    stmt.run(couponStatusToString(couponDomain.status(updated)), couponDomain.updated_at(updated), coupon_id);
    return updated;
  }

  private normalizeCoupon(coupon: couponDomain.Coupon$): couponDomain.Coupon$ {
    const updated = couponDomain.update_status_by_time(coupon);
    if (updated !== coupon) {
      const stmt = this.db.prepare(`
        UPDATE coupons
        SET status = ?, updated_at = ?
        WHERE coupon_id = ?
      `);
      stmt.run(
        couponStatusToString(couponDomain.status(updated)),
        couponDomain.updated_at(updated),
        couponDomain.coupon_id(updated)
      );
    }

    return updated;
  }

  private mapToCoupon(row: any): couponDomain.Coupon$ {
    const discountType = discountTypeFromDb(row.discount_type as DiscountTypeString, row.discount_value);
    const status = couponStatusFromString(row.status as CouponStatusString);

    const coupon = unwrapResult(
      couponDomain.reconstitute(
        row.coupon_id,
        row.code,
        discountType,
        row.discount_value,
        row.valid_from,
        row.valid_until,
        status,
        row.created_at,
        row.updated_at
      )
    );

    return this.normalizeCoupon(coupon);
  }
}
