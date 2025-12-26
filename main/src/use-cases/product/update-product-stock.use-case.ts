import { Database } from 'bun:sqlite';

import { getDatabase } from '../../config/database';
import { ProductRepository } from '../../db/repositories/product.repository';
import { NotFoundError, ValidationError } from '../app-errors';

import type { UpdateProductStockRequest } from '../../api/dto/product.dto';

import * as productDomain from '@core/domain/product';

export class UpdateProductStockUseCase {
  private readonly repository: ProductRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new ProductRepository(db);
  }

  execute(product_id: number, request: UpdateProductStockRequest): productDomain.Product$ {
    if (request.stock < 0) {
      throw new ValidationError('Stock must be non-negative');
    }

    const updated = this.repository.updateStock(product_id, request.stock);
    if (!updated) throw new NotFoundError('Product not found');
    return updated;
  }
}


