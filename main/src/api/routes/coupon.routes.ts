import { Hono } from 'hono';
import type { CalculateDiscountRequest, CreateCouponRequest, } from '../dto/coupon.dto';
import { toCouponResponse } from '../dto/coupon.dto';
import { handleRouteError } from './_shared/route-helpers';
import { ListCouponsUseCase } from '@main/use-cases/coupon/list-coupons.use-case';
import { ListActiveCouponsUseCase } from '@main/use-cases/coupon/list-active-coupons.use-case';
import { GetCouponByCodeUseCase } from '@main/use-cases/coupon/get-coupon-by-code.use-case';
import { CreateCouponUseCase } from '@main/use-cases/coupon/create-coupon.use-case';
import { CalculateCouponDiscountUseCase } from '@main/use-cases/coupon/calculate-coupon-discount.use-case';

const app = new Hono();
const listCouponsUseCase = new ListCouponsUseCase();
const listActiveCouponsUseCase = new ListActiveCouponsUseCase();
const getCouponByCodeUseCase = new GetCouponByCodeUseCase();
const createCouponUseCase = new CreateCouponUseCase();
const calculateCouponDiscountUseCase = new CalculateCouponDiscountUseCase();

// GET /coupons - 모든 쿠폰 조회
app.get('/', (c) => {
  try {
    const coupons = listCouponsUseCase.execute();
    return c.json({
      success: true,
      data: coupons.map(toCouponResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /coupons/active - 활성 쿠폰 조회
app.get('/active', (c) => {
  try {
    const coupons = listActiveCouponsUseCase.execute();
    return c.json({
      success: true,
      data: coupons.map(toCouponResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /coupons/:code - 쿠폰 코드로 조회
app.get('/:code', (c) => {
  try {
    const code = c.req.param('code');
    const coupon = getCouponByCodeUseCase.execute(code);
    return c.json({
      success: true,
      data: toCouponResponse(coupon),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /coupons - 새 쿠폰 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateCouponRequest>();
    const coupon = createCouponUseCase.execute(body);

    return c.json(
      {
        success: true,
        data: toCouponResponse(coupon),
      },
      201
    );
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /coupons/:code/calculate - 할인 금액 계산
app.post('/:code/calculate', async (c) => {
  try {
    const code = c.req.param('code');
    const body = await c.req.json<CalculateDiscountRequest>();
    const result = calculateCouponDiscountUseCase.execute(code, body.original_price);
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default app;
