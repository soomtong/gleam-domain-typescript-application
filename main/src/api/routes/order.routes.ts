import { Hono } from 'hono';
import type { CreateOrderRequest } from '../dto/order.dto';
import { toOrderResponse } from '../dto/order.dto';
import { handleRouteError, parseIntParamOrThrow } from './_shared/route-helpers';
import { ListOrdersUseCase } from '@main/use-cases/order/list-orders.use-case';
import { GetOrderUseCase } from '@main/use-cases/order/get-order.use-case';
import { CreateOrderUseCase } from '@main/use-cases/order/create-order.use-case';
import { ConfirmOrderUseCase } from '@main/use-cases/order/confirm-order.use-case';
import { CancelOrderUseCase } from '@main/use-cases/order/cancel-order.use-case';
import { CompleteOrderUseCase } from '@main/use-cases/order/complete-order.use-case';

const app = new Hono();
const listOrdersUseCase = new ListOrdersUseCase();
const getOrderUseCase = new GetOrderUseCase();
const createOrderUseCase = new CreateOrderUseCase();
const confirmOrderUseCase = new ConfirmOrderUseCase();
const cancelOrderUseCase = new CancelOrderUseCase();
const completeOrderUseCase = new CompleteOrderUseCase();

// GET /orders - 모든 주문 조회
app.get('/', (c) => {
  try {
    const orders = listOrdersUseCase.execute();
    return c.json({
      success: true,
      data: orders.map(toOrderResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /orders/:id - 주문 ID로 조회
app.get('/:id', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const order = getOrderUseCase.execute(id);
    return c.json({
      success: true,
      data: toOrderResponse(order),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /orders - 새 주문 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateOrderRequest>();
    const order = createOrderUseCase.execute(body);

    return c.json(
      {
        success: true,
        data: toOrderResponse(order),
      },
      201
    );
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /orders/:id/confirm - 주문 확정
app.post('/:id/confirm', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const order = confirmOrderUseCase.execute(id);

    return c.json({
      success: true,
      data: toOrderResponse(order),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /orders/:id/cancel - 주문 취소
app.post('/:id/cancel', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const order = cancelOrderUseCase.execute(id);

    return c.json({
      success: true,
      data: toOrderResponse(order),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /orders/:id/complete - 주문 완료 (결제 완료 후)
app.post('/:id/complete', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const order = completeOrderUseCase.execute(id);

    return c.json({
      success: true,
      data: toOrderResponse(order),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default app;
