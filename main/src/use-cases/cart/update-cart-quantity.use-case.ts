import { Database } from 'bun:sqlite';

import { getDatabase } from '@main/config/database';
import { CartRepository } from '@main/db/repositories/cart.repository';
import { ProductRepository } from '@main/db/repositories/product.repository';
import { NotFoundError, ValidationError } from '@main/use-cases/app-errors';

import type { UpdateCartQuantityRequest } from '@main/api/dto/cart.dto';

import * as cartDomain from '@core/domain/cart';
import * as productDomain from '@core/domain/product';

export class UpdateCartQuantityUseCase {
  private readonly cartRepository: CartRepository;
  private readonly productRepository: ProductRepository;

  constructor(db: Database = getDatabase()) {
    this.cartRepository = new CartRepository(db);
    this.productRepository = new ProductRepository(db);
  }

  execute(cart_id: number, request: UpdateCartQuantityRequest): cartDomain.Cart$ {
    if (request.quantity <= 0) {
      throw new ValidationError('Quantity must be positive');
    }

    const cart = this.cartRepository.findById(cart_id);
    if (!cart) throw new NotFoundError('Cart not found');

    const product = this.productRepository.findById(cartDomain.product_id(cart));
    if (!product) throw new NotFoundError('Product not found');

    if (productDomain.stock(product) < request.quantity) {
      throw new ValidationError(`Insufficient stock. Available: ${productDomain.stock(product)}`);
    }

    const updated = this.cartRepository.updateQuantity(cart_id, request.quantity);
    if (!updated) throw new NotFoundError('Cart not found');
    return updated;
  }
}


