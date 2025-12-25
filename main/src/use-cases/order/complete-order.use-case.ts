import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { OrderRepository } from '@main/db/repositories/order.repository';
import { NotFoundError } from '@main/use-cases/app-errors';

import * as orderDomain from '@core/domain/order';

export class CompleteOrderUseCase {
  private readonly repository: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new OrderRepository(db);
  }

  execute(order_id: number): orderDomain.Order$ {
    const updated = this.repository.updateStatus(order_id, 'Completed');
    if (!updated) throw new NotFoundError('Order not found');
    return updated;
  }
}


