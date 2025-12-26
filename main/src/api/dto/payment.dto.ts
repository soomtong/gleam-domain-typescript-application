import type { Payment$ as Payment } from '@core/domain/payment';
import * as paymentDomain from '@core/domain/payment';

import { paymentStatusToString, type PaymentStatusString } from '../../domain/core-domain';

// Request DTOs
export interface CreatePaymentRequest {
  order_id: number;
  amount: number;
}

// Response DTOs
export interface PaymentResponse {
  payment_id: number;
  order_id: number;
  paid_at: string;
  amount: number;
  status: PaymentStatusString;
  created_at: string;
  updated_at: string;
}

// Mappers
export function toPaymentResponse(payment: Payment): PaymentResponse {
  return {
    payment_id: paymentDomain.payment_id(payment),
    order_id: paymentDomain.order_id(payment),
    paid_at: new Date(paymentDomain.paid_at(payment)).toISOString(),
    amount: paymentDomain.amount(payment),
    status: paymentStatusToString(paymentDomain.status(payment)),
    created_at: new Date(paymentDomain.created_at(payment)).toISOString(),
    updated_at: new Date(paymentDomain.updated_at(payment)).toISOString(),
  };
}
