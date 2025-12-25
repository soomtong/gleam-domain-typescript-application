import type { Payment$ as Payment } from '@core/domain/payment';
import * as paymentDomain from '@core/domain/payment';

import { paymentStatusToString, type PaymentStatusString } from '../../domain/core-domain';

// Request DTOs
export interface CreatePaymentRequest {
  order_id: number;
  amount: number;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatusString;
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
    paid_at: paymentDomain.paid_at(payment),
    amount: paymentDomain.amount(payment),
    status: paymentStatusToString(paymentDomain.status(payment)),
    created_at: paymentDomain.created_at(payment),
    updated_at: paymentDomain.updated_at(payment),
  };
}
