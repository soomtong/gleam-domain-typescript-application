import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { CartRepository } from '../../db/repositories/cart.repository';

import * as cartDomain from '@core/domain/cart';

export class ListActiveCartsUseCase {
  private readonly repository: CartRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new CartRepository(db);
  }

  execute(): cartDomain.Cart$[] {
    return this.repository.findActive();
  }
}


