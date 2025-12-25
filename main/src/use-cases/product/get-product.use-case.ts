import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { ProductRepository } from '@main/db/repositories/product.repository';
import { NotFoundError } from '@main/use-cases/app-errors';

import * as productDomain from '@core/domain/product';

export class GetProductUseCase {
  private readonly repository: ProductRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new ProductRepository(db);
  }

  execute(product_id: number): productDomain.Product$ {
    const product = this.repository.findById(product_id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }
}


