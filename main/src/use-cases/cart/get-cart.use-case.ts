import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CartRepository } from '@main/db/repositories/cart.repository';
import { NotFoundError } from '@main/use-cases/app-errors';

import * as cartDomain from '@core/domain/cart';

export class GetCartUseCase {
  private readonly repository: CartRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new CartRepository(db);
  }

  execute(cart_id: number): cartDomain.Cart$ {
    const cart = this.repository.findById(cart_id);
    if (!cart) throw new NotFoundError('Cart not found');
    return cart;
  }
}


