import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { OrderRepository } from '@main/db/repositories/order.repository';
import { PaymentRepository } from '@main/db/repositories/payment.repository';
import { ConflictError, NotFoundError, ValidationError } from '@main/use-cases/app-errors';
import { orderStatusToString } from '@main/domain/core-domain';

import type { CreatePaymentRequest } from '@main/api/dto/payment.dto';

import * as orderDomain from '@core/domain/order';
import * as paymentDomain from '@core/domain/payment';

export class CreatePaymentUseCase {
  private readonly orderRepository: OrderRepository;
  private readonly paymentRepository: PaymentRepository;

  constructor(db: Database = getDatabase()) {
    this.orderRepository = new OrderRepository(db);
    this.paymentRepository = new PaymentRepository(db);
  }

  execute(request: CreatePaymentRequest): paymentDomain.Payment$ {
    if (typeof request.order_id !== 'number' || typeof request.amount !== 'number') {
      throw new ValidationError('Invalid request');
    }

    const order = this.orderRepository.findById(request.order_id);
    if (!order) throw new NotFoundError('Order not found');

    const orderStatus = orderStatusToString(orderDomain.status(order));
    if (orderStatus !== 'Confirmed') {
      throw new ValidationError(`Cannot create payment for ${orderStatus.toLowerCase()} order`);
    }

    const existingPayment = this.paymentRepository.findByOrderId(request.order_id);
    if (existingPayment) {
      throw new ConflictError('Payment already exists for this order');
    }

    return this.paymentRepository.create({
      order_id: request.order_id,
      amount: request.amount,
    });
  }
}


