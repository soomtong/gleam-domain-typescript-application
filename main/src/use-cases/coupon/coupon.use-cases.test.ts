import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '../_test-helpers';
import { ConflictError, NotFoundError, ValidationError } from '../app-errors';

import { CouponRepository } from '../../db/repositories/coupon.repository';
import { CreateCouponUseCase } from './create-coupon.use-case';
import { GetCouponByCodeUseCase } from './get-coupon-by-code.use-case';
import { ListActiveCouponsUseCase } from './list-active-coupons.use-case';
import { ListCouponsUseCase } from './list-coupons.use-case';
import { CalculateCouponDiscountUseCase } from './calculate-coupon-discount.use-case';

import * as couponDomain from '@core/domain/coupon';

describe('Coupon use-cases', () => {
  it('CreateCouponUseCase creates coupon and prevents duplicate codes', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreateCouponUseCase(db);

    const now = Date.now();
    const coupon = useCase.execute({
      code: 'P15',
      discount_type: 'Percentage',
      discount_value: 15,
      valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(couponDomain.coupon_id(coupon)).toBeGreaterThan(0);
    expect(couponDomain.code(coupon)).toBe('P15');

    expect(() =>
      useCase.execute({
        code: 'P15',
        discount_type: 'Percentage',
        discount_value: 10,
        valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      })
    ).toThrow(ConflictError);
  });

  it('CreateCouponUseCase validates discount values', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreateCouponUseCase(db);

    const now = Date.now();
    expect(() =>
      useCase.execute({
        code: 'X',
        discount_type: 'Percentage',
        discount_value: 101,
        valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      })
    ).toThrow(ValidationError);

    expect(() =>
      useCase.execute({
        code: 'X2',
        discount_type: 'Fixed',
        discount_value: 0,
        valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      })
    ).toThrow(ValidationError);
  });

  it('GetCouponByCodeUseCase returns coupon or throws NotFoundError', () => {
    const db = createInMemoryDatabase();
    const repo = new CouponRepository(db);
    const now = Date.now();
    repo.create({
      code: 'P15',
      discount_type: 'Percentage',
      discount_value: 15,
      valid_from: now - 24 * 60 * 60 * 1000,
      valid_until: now + 24 * 60 * 60 * 1000,
    });

    const useCase = new GetCouponByCodeUseCase(db);
    const coupon = useCase.execute('P15');
    expect(couponDomain.code(coupon)).toBe('P15');

    expect(() => useCase.execute('MISSING')).toThrow(NotFoundError);
  });

  it('ListCouponsUseCase and ListActiveCouponsUseCase list correctly by status/time', () => {
    const db = createInMemoryDatabase();
    const repo = new CouponRepository(db);
    const now = Date.now();

    repo.create({
      code: 'ACTIVE',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: now - 24 * 60 * 60 * 1000,
      valid_until: now + 24 * 60 * 60 * 1000,
    });

    repo.create({
      code: 'INACTIVE',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: now + 24 * 60 * 60 * 1000,
      valid_until: now + 2 * 24 * 60 * 60 * 1000,
    });

    repo.create({
      code: 'EXPIRED',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: now - 2 * 24 * 60 * 60 * 1000,
      valid_until: now - 24 * 60 * 60 * 1000,
    });

    const listAll = new ListCouponsUseCase(db).execute();
    expect(listAll.length).toBe(3);

    const active = new ListActiveCouponsUseCase(db).execute();
    expect(active.map(c => couponDomain.code(c))).toEqual(['ACTIVE']);
  });

  it('CalculateCouponDiscountUseCase calculates discount for active coupons and validates inputs', () => {
    const db = createInMemoryDatabase();
    const createCoupon = new CreateCouponUseCase(db);
    const calculate = new CalculateCouponDiscountUseCase(db);

    const now = Date.now();
    createCoupon.execute({
      code: 'P15',
      discount_type: 'Percentage',
      discount_value: 15,
      valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });

    createCoupon.execute({
      code: 'F150',
      discount_type: 'Fixed',
      discount_value: 150,
      valid_from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      valid_until: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });

    const pct = calculate.execute('P15', 99);
    expect(pct.discount_amount).toBe(14);
    expect(pct.final_price).toBe(85);

    const fixed = calculate.execute('F150', 100);
    expect(fixed.discount_amount).toBe(100);
    expect(fixed.final_price).toBe(0);

    expect(() => calculate.execute('P15', -1)).toThrow(ValidationError);
    expect(() => calculate.execute('MISSING', 100)).toThrow(NotFoundError);

    const repo = new CouponRepository(db);
    repo.create({
      code: 'EXPIRED2',
      discount_type: 'Fixed',
      discount_value: 10,
      valid_from: now - 2 * 24 * 60 * 60 * 1000,
      valid_until: now - 24 * 60 * 60 * 1000,
    });

    expect(() => calculate.execute('EXPIRED2', 100)).toThrow(ValidationError);
  });
});


