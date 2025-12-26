import type { Product$ as Product } from '@core/domain/product';
import * as productDomain from '@core/domain/product';

import { productStatusToString } from '../../domain/core-domain';

export interface CreateProductRequest {
  title: string;
  price: number;
  stock: number;
  begin_at: string;
  end_at: string;
}

export interface UpdateProductStockRequest {
  stock: number;
}

export interface ProductResponse {
  product_id: number;
  title: string;
  price: number;
  stock: number;
  begin_at: string;
  end_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    product_id: productDomain.product_id(product),
    title: productDomain.title(product),
    price: productDomain.price(product),
    stock: productDomain.stock(product),
    begin_at: new Date(productDomain.begin_at(product)).toISOString(),
    end_at: new Date(productDomain.end_at(product)).toISOString(),
    status: productStatusToString(productDomain.status(product)),
    created_at: new Date(productDomain.created_at(product)).toISOString(),
    updated_at: new Date(productDomain.updated_at(product)).toISOString(),
  };
}
