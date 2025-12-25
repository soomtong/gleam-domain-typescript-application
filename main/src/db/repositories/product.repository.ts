import type { Database } from "bun:sqlite";

import * as productDomain from "@core/domain/product";

import {
  productStatusFromString,
  productStatusToString,
  unwrapResult,
  type ProductStatusString,
} from "../../domain/core-domain";

export class ProductRepository {
  constructor(private db: Database) {}

  create(data: {
    title: string;
    price: number;
    stock: number;
    begin_at: number;
    end_at: number;
  }): productDomain.Product$ {
    const provisionalProduct = unwrapResult(
      productDomain.create(0, data.title, data.price, data.stock, data.begin_at, data.end_at)
    );

    const status = productStatusToString(productDomain.status(provisionalProduct));

    const stmt = this.db.prepare(`
      INSERT INTO products (title, price, stock, begin_at, end_at, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      productDomain.title(provisionalProduct),
      productDomain.price(provisionalProduct),
      productDomain.stock(provisionalProduct),
      productDomain.begin_at(provisionalProduct),
      productDomain.end_at(provisionalProduct),
      status,
      productDomain.created_at(provisionalProduct),
      productDomain.updated_at(provisionalProduct)
    );

    const product_id = Number(result.lastInsertRowid);
    return unwrapResult(productDomain.assign_id(provisionalProduct, product_id));
  }

  findById(product_id: number): productDomain.Product$ | null {
    const stmt = this.db.prepare(`
      SELECT * FROM products WHERE product_id = ?
    `);

    const row = stmt.get(product_id) as any;
    return row ? this.mapToProduct(row) : null;
  }

  findAll(): productDomain.Product$[] {
    const stmt = this.db.prepare(`
      SELECT * FROM products ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapToProduct(row));
  }

  updateStock(product_id: number, new_stock: number): productDomain.Product$ | null {
    const existing = this.findById(product_id);
    if (!existing) return null;

    const updated = unwrapResult(productDomain.update_stock(existing, new_stock));
    const status = productStatusToString(productDomain.status(updated));

    const stmt = this.db.prepare(`
      UPDATE products
      SET stock = ?, status = ?, updated_at = ?
      WHERE product_id = ?
    `);

    stmt.run(productDomain.stock(updated), status, productDomain.updated_at(updated), product_id);
    return updated;
  }

  private mapToProduct(row: any): productDomain.Product$ {
    const status = productStatusFromString(row.status as ProductStatusString);
    return unwrapResult(
      productDomain.reconstitute(
        row.product_id,
        row.title,
        row.price,
        row.stock,
        row.begin_at,
        row.end_at,
        status,
        row.created_at,
        row.updated_at
      )
    );
  }
}
