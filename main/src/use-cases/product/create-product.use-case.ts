import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { ProductRepository } from '@main/db/repositories/product.repository';
import { ValidationError } from '@main/use-cases/app-errors';
import { parseDateTimeToMillis } from '@main/use-cases/_datetime';

import type { CreateProductRequest } from '@main/api/dto/product.dto';

import * as productDomain from '@core/domain/product';

export class CreateProductUseCase {
  private readonly repository: ProductRepository;

  constructor(db: Database = getDatabase()) {
    this.repository = new ProductRepository(db);
  }

  execute(request: CreateProductRequest): productDomain.Product$ {
    if (!request.title || request.price < 0 || request.stock < 0) {
      throw new ValidationError(
        'Invalid request: title is required, price and stock must be non-negative'
      );
    }

    return this.repository.create({
      ...request,
      begin_at: parseDateTimeToMillis(request.begin_at, 'begin_at'),
      end_at: parseDateTimeToMillis(request.end_at, 'end_at'),
    });
  }
}


