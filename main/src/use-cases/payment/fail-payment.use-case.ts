import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { PaymentRepository } from '@main/db/repositories/payment.repository';
import { NotFoundError } from '@main/use-cases/app-errors';

import * as paymentDomain from '@core/domain/payment';

export class FailPaymentUseCase {
  private readonly repository: PaymentRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new PaymentRepository(db);
  }

  execute(payment_id: number): paymentDomain.Payment$ {
    const payment = this.repository.updateStatus(payment_id, 'Failed');
    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  }
}


