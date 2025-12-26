import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { OrderRepository } from '../../db/repositories/order.repository';
import { ValidationError } from '../app-errors';

import type { CreateOrderRequest } from '../../api/dto/order.dto';

import * as orderDomain from '@core/domain/order';

export class CreateOrderUseCase {
  private readonly repository: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new OrderRepository(db);
  }

  execute(request: CreateOrderRequest): orderDomain.Order$ {
    if (
      typeof request.cart_id !== 'number' ||
      typeof request.product_id !== 'number' ||
      typeof request.quantity !== 'number' ||
      typeof request.paid_amount !== 'number' ||
      typeof request.discount_amount !== 'number'
    ) {
      throw new ValidationError('Invalid request');
    }

    return this.repository.create({
      cart_id: request.cart_id,
      product_id: request.product_id,
      coupon_id: request.coupon_id ?? null,
      quantity: request.quantity,
      paid_amount: request.paid_amount,
      discount_amount: request.discount_amount,
    });
  }
}


