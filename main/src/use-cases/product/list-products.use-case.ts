import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { ProductRepository } from '../../db/repositories/product.repository';

import * as productDomain from '@core/domain/product';

export class ListProductsUseCase {
  private readonly repository: ProductRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new ProductRepository(db);
  }

  execute(): productDomain.Product$[] {
    return this.repository.findAll();
  }
}


