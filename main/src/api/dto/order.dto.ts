import type { Order$ as Order } from '@core/domain/order';
import * as orderDomain from '@core/domain/order';

import { nullableIntFromOption, orderStatusToString, type OrderStatusString } from '../../domain/core-domain';

// Request DTOs
export interface CreateOrderRequest {
  cart_id: number;
  product_id: number;
  coupon_id?: number | null;
  quantity: number;
  paid_amount: number;
  discount_amount: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatusString;
}

// Response DTOs
export interface OrderResponse {
  order_id: number;
  cart_id: number;
  product_id: number;
  coupon_id: number | null;
  quantity: number;
  paid_amount: number;
  discount_amount: number;
  status: OrderStatusString;
  created_at: string;
  updated_at: string;
}

// Mappers
export function toOrderResponse(order: Order): OrderResponse {
  return {
    order_id: orderDomain.order_id(order),
    cart_id: orderDomain.cart_id(order),
    product_id: orderDomain.product_id(order),
    coupon_id: nullableIntFromOption(orderDomain.coupon_id(order)),
    quantity: orderDomain.quantity(order),
    paid_amount: orderDomain.paid_amount(order),
    discount_amount: orderDomain.discount_amount(order),
    status: orderStatusToString(orderDomain.status(order)),
    created_at: orderDomain.created_at(order),
    updated_at: orderDomain.updated_at(order),
  };
}
