import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { PaymentRepository } from '../../db/repositories/payment.repository';
import { OrderRepository } from '../../db/repositories/order.repository';
import { NotFoundError } from '../app-errors';

import * as paymentDomain from '@core/domain/payment';

export class CompletePaymentUseCase {
  private readonly paymentRepository: PaymentRepository;
  private readonly orderRepository: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.paymentRepository = new PaymentRepository(db);
    this.orderRepository = new OrderRepository(db);
  }

  execute(payment_id: number): paymentDomain.Payment$ {
    const payment = this.paymentRepository.updateStatus(payment_id, 'Completed');
    if (!payment) throw new NotFoundError('Payment not found');

    try {
      this.orderRepository.updateStatus(paymentDomain.order_id(payment), 'Completed');
    } catch (error) {
      console.error('Failed to update order status:', error);
    }

    return payment;
  }
}


