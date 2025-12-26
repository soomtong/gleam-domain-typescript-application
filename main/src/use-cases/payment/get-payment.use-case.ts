import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { PaymentRepository } from '../../db/repositories/payment.repository';
import { NotFoundError } from '../app-errors';

import * as paymentDomain from '@core/domain/payment';

export class GetPaymentUseCase {
  private readonly repository: PaymentRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new PaymentRepository(db);
  }

  execute(payment_id: number): paymentDomain.Payment$ {
    const payment = this.repository.findById(payment_id);
    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  }
}


