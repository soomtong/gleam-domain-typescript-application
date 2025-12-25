import { Hono } from 'hono';
import type { CreatePaymentRequest } from '../dto/payment.dto';
import { toPaymentResponse } from '../dto/payment.dto';
import { handleRouteError, parseIntParamOrThrow } from './_shared/route-helpers';
import { ListPaymentsUseCase } from '@main/use-cases/payment/list-payments.use-case';
import { GetPaymentUseCase } from '@main/use-cases/payment/get-payment.use-case';
import { CreatePaymentUseCase } from '@main/use-cases/payment/create-payment.use-case';
import { CompletePaymentUseCase } from '@main/use-cases/payment/complete-payment.use-case';
import { FailPaymentUseCase } from '@main/use-cases/payment/fail-payment.use-case';
import { RefundPaymentUseCase } from '@main/use-cases/payment/refund-payment.use-case';

const app = new Hono();
const listPaymentsUseCase = new ListPaymentsUseCase();
const getPaymentUseCase = new GetPaymentUseCase();
const createPaymentUseCase = new CreatePaymentUseCase();
const completePaymentUseCase = new CompletePaymentUseCase();
const failPaymentUseCase = new FailPaymentUseCase();
const refundPaymentUseCase = new RefundPaymentUseCase();

// GET /payments - 모든 결제 조회
app.get('/', (c) => {
  try {
    const payments = listPaymentsUseCase.execute();
    return c.json({
      success: true,
      data: payments.map(toPaymentResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /payments/:id - 결제 ID로 조회
app.get('/:id', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const payment = getPaymentUseCase.execute(id);
    return c.json({
      success: true,
      data: toPaymentResponse(payment),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /payments - 새 결제 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreatePaymentRequest>();
    const payment = createPaymentUseCase.execute(body);

    return c.json(
      {
        success: true,
        data: toPaymentResponse(payment),
      },
      201
    );
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /payments/:id/complete - 결제 완료
app.post('/:id/complete', async (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const payment = completePaymentUseCase.execute(id);

    return c.json({
      success: true,
      data: toPaymentResponse(payment),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /payments/:id/fail - 결제 실패
app.post('/:id/fail', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const payment = failPaymentUseCase.execute(id);

    return c.json({
      success: true,
      data: toPaymentResponse(payment),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /payments/:id/refund - 환불 처리
app.post('/:id/refund', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const payment = refundPaymentUseCase.execute(id);

    return c.json({
      success: true,
      data: toPaymentResponse(payment),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default app;
