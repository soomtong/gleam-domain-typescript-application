import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { PaymentRepository } from '../../db/repositories/payment.repository';

import * as paymentDomain from '@core/domain/payment';

export class ListPaymentsUseCase {
  private readonly repository: PaymentRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new PaymentRepository(db);
  }

  execute(): paymentDomain.Payment$[] {
    return this.repository.findAll();
  }
}


