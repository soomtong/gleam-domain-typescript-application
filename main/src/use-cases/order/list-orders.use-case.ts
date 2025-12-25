import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { OrderRepository } from '@main/db/repositories/order.repository';

import * as orderDomain from '@core/domain/order';

export class ListOrdersUseCase {
  private readonly repository: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new OrderRepository(db);
  }

  execute(): orderDomain.Order$[] {
    return this.repository.findAll();
  }
}


