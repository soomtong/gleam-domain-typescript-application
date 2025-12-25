import { describe, expect, it } from 'bun:test';

import { createInMemoryDatabase } from '@main/use-cases/_test-helpers';
import { NotFoundError, ValidationError } from '@main/use-cases/app-errors';
import { productStatusToString } from '@main/domain/core-domain';

import { ProductRepository } from '@main/db/repositories/product.repository';
import { CreateProductUseCase } from './create-product.use-case';
import { GetProductUseCase } from './get-product.use-case';
import { ListProductsUseCase } from './list-products.use-case';
import { UpdateProductStockUseCase } from './update-product-stock.use-case';

import * as productDomain from '@core/domain/product';

describe('Product use-cases', () => {
  it('CreateProductUseCase creates a product', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreateProductUseCase(db);

    const product = useCase.execute({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: '2000-01-01T00:00:00.000Z',
      end_at: '2100-01-01T00:00:00.000Z',
    });

    expect(productDomain.product_id(product)).toBeGreaterThan(0);
    expect(productDomain.title(product)).toBe('T');
    expect(productDomain.price(product)).toBe(100);
    expect(productDomain.stock(product)).toBe(10);
    expect(productStatusToString(productDomain.status(product))).toBe('Active');
  });

  it('CreateProductUseCase rejects invalid requests', () => {
    const db = createInMemoryDatabase();
    const useCase = new CreateProductUseCase(db);

    expect(() =>
      useCase.execute({
        title: '',
        price: 100,
        stock: 10,
        begin_at: '2000-01-01T00:00:00.000Z',
        end_at: '2100-01-01T00:00:00.000Z',
      })
    ).toThrow(ValidationError);

    expect(() =>
      useCase.execute({
        title: 'T',
        price: -1,
        stock: 10,
        begin_at: '2000-01-01T00:00:00.000Z',
        end_at: '2100-01-01T00:00:00.000Z',
      })
    ).toThrow(ValidationError);

    expect(() =>
      useCase.execute({
        title: 'T',
        price: 100,
        stock: -1,
        begin_at: '2000-01-01T00:00:00.000Z',
        end_at: '2100-01-01T00:00:00.000Z',
      })
    ).toThrow(ValidationError);
  });

  it('GetProductUseCase returns product or throws NotFoundError', () => {
    const db = createInMemoryDatabase();
    const repo = new ProductRepository(db);
    const product = repo.create({
      title: 'T',
      price: 100,
      stock: 10,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    const useCase = new GetProductUseCase(db);
    const fetched = useCase.execute(productDomain.product_id(product));
    expect(productDomain.product_id(fetched)).toBe(productDomain.product_id(product));

    expect(() => useCase.execute(9999)).toThrow(NotFoundError);
  });

  it('ListProductsUseCase lists all products', () => {
    const db = createInMemoryDatabase();
    const repo = new ProductRepository(db);
    repo.create({
      title: 'A',
      price: 100,
      stock: 1,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });
    repo.create({
      title: 'B',
      price: 200,
      stock: 2,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    const useCase = new ListProductsUseCase(db);
    const products = useCase.execute();

    expect(products.length).toBe(2);
    const titles = products.map(p => productDomain.title(p));
    expect(titles).toContain('A');
    expect(titles).toContain('B');
  });

  it('UpdateProductStockUseCase updates stock and may set OutOfStock', () => {
    const db = createInMemoryDatabase();
    const repo = new ProductRepository(db);
    const product = repo.create({
      title: 'T',
      price: 100,
      stock: 1,
      begin_at: Date.parse('2000-01-01T00:00:00.000Z'),
      end_at: Date.parse('2100-01-01T00:00:00.000Z'),
    });

    const useCase = new UpdateProductStockUseCase(db);
    const updated = useCase.execute(productDomain.product_id(product), { stock: 0 });

    expect(productDomain.stock(updated)).toBe(0);
    expect(productStatusToString(productDomain.status(updated))).toBe('OutOfStock');
  });

  it('UpdateProductStockUseCase rejects negative stock and throws NotFoundError for missing product', () => {
    const db = createInMemoryDatabase();
    const useCase = new UpdateProductStockUseCase(db);

    expect(() => useCase.execute(1, { stock: -1 })).toThrow(ValidationError);
    expect(() => useCase.execute(9999, { stock: 1 })).toThrow(NotFoundError);
  });
});


