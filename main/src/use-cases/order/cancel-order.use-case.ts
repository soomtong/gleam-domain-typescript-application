import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { OrderRepository } from '../../db/repositories/order.repository';
import { NotFoundError } from '../app-errors';

import * as orderDomain from '@core/domain/order';

export class CancelOrderUseCase {
  private readonly repository: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new OrderRepository(db);
  }

  execute(order_id: number): orderDomain.Order$ {
    const updated = this.repository.updateStatus(order_id, 'Cancelled');
    if (!updated) throw new NotFoundError('Order not found');
    return updated;
  }
}


