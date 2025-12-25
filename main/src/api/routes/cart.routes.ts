import { Hono } from 'hono';
import type {
  CreateCartRequest,
  UpdateCartCouponRequest,
  UpdateCartQuantityRequest,
} from '../dto/cart.dto';
import { toCartResponse } from '../dto/cart.dto';
import { CheckoutCartUseCase } from '@main/use-cases/checkout-cart.use-case';
import { handleRouteError, parseIntParamOrThrow } from './_shared/route-helpers';
import { CreateCartUseCase } from '@main/use-cases/cart/create-cart.use-case';
import { GetCartUseCase } from '@main/use-cases/cart/get-cart.use-case';
import { ListCartsUseCase } from '@main/use-cases/cart/list-carts.use-case';
import { ListActiveCartsUseCase } from '@main/use-cases/cart/list-active-carts.use-case';
import { UpdateCartCouponUseCase } from '@main/use-cases/cart/update-cart-coupon.use-case';
import { UpdateCartQuantityUseCase } from '@main/use-cases/cart/update-cart-quantity.use-case';

const app = new Hono();

const checkoutUseCase = new CheckoutCartUseCase();
const listCartsUseCase = new ListCartsUseCase();
const listActiveCartsUseCase = new ListActiveCartsUseCase();
const getCartUseCase = new GetCartUseCase();
const createCartUseCase = new CreateCartUseCase();
const updateCartCouponUseCase = new UpdateCartCouponUseCase();
const updateCartQuantityUseCase = new UpdateCartQuantityUseCase();

// GET /carts - 모든 장바구니 조회
app.get('/', (c) => {
  try {
    const carts = listCartsUseCase.execute();
    return c.json({
      success: true,
      data: carts.map(toCartResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /carts/active - 활성 장바구니 조회
app.get('/active', (c) => {
  try {
    const carts = listActiveCartsUseCase.execute();
    return c.json({
      success: true,
      data: carts.map(toCartResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /carts/:id - 장바구니 ID로 조회
app.get('/:id', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const cart = getCartUseCase.execute(id);
    return c.json({
      success: true,
      data: toCartResponse(cart),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /carts - 새 장바구니 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateCartRequest>();
    const cart = createCartUseCase.execute(body);

    return c.json(
      {
        success: true,
        data: toCartResponse(cart),
      },
      201
    );
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// PATCH /carts/:id/coupon - 쿠폰 추가/제거
app.patch('/:id/coupon', async (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const body = await c.req.json<UpdateCartCouponRequest>();
    const cart = updateCartCouponUseCase.execute(id, body);

    return c.json({
      success: true,
      data: toCartResponse(cart),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// PATCH /carts/:id/quantity - 수량 변경
app.patch('/:id/quantity', async (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const body = await c.req.json<UpdateCartQuantityRequest>();
    const updatedCart = updateCartQuantityUseCase.execute(id, body);

    return c.json({
      success: true,
      data: toCartResponse(updatedCart),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /carts/:id/checkout - 장바구니 체크아웃 (Order 생성)
app.post('/:id/checkout', async (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');

    const result = checkoutUseCase.execute(id);

    return c.json(
      {
        success: true,
        data: {
          order_id: result.order.order_id,
          cart_id: result.cart_id,
          product_id: result.product_id,
          quantity: result.quantity,
          original_amount: result.original_amount,
          discount_amount: result.discount_amount,
          paid_amount: result.paid_amount,
          coupon_code: result.coupon_code,
          order_status: result.order.status,
          created_at: result.order.created_at,
        },
      },
      201
    );
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default app;
