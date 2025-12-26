import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { OrderRepository } from '../../db/repositories/order.repository';
import { NotFoundError } from '../app-errors';

import * as orderDomain from '@core/domain/order';

export class GetOrderUseCase {
  private readonly repository: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new OrderRepository(db);
  }

  execute(order_id: number): orderDomain.Order$ {
    const order = this.repository.findById(order_id);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }
}


