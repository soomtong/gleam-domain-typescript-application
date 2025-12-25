import { Database } from 'bun:sqlite';
import { getDatabase } from '../../config/database';

import * as orderDomain from '@core/domain/order';
import type { Result } from '@core/domain/gleam';

import {
  nullableIntFromOption,
  optionFromNullableInt,
  orderStatusFromString,
  orderStatusToString,
  unwrapResult,
  type OrderStatusString,
} from '../../domain/core-domain';

export interface CreateOrderData {
  cart_id: number;
  product_id: number;
  coupon_id?: number | null;
  quantity: number;
  paid_amount: number;
  discount_amount: number;
}

export class OrderRepository {
  constructor(private db: Database = getDatabase()) {}

  create(data: CreateOrderData): orderDomain.Order$ {
    const provisionalOrder = unwrapResult(
      orderDomain.create(
        0,
        data.cart_id,
        data.product_id,
        optionFromNullableInt(data.coupon_id ?? null),
        data.quantity,
        data.paid_amount,
        data.discount_amount
      )
    );

    const stmt = this.db.prepare(`
      INSERT INTO orders (
        cart_id, product_id, coupon_id, quantity,
        paid_amount, discount_amount, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      orderDomain.cart_id(provisionalOrder),
      orderDomain.product_id(provisionalOrder),
      nullableIntFromOption(orderDomain.coupon_id(provisionalOrder)),
      orderDomain.quantity(provisionalOrder),
      orderDomain.paid_amount(provisionalOrder),
      orderDomain.discount_amount(provisionalOrder),
      orderStatusToString(orderDomain.status(provisionalOrder)),
      orderDomain.created_at(provisionalOrder),
      orderDomain.updated_at(provisionalOrder)
    );

    const order_id = Number(result.lastInsertRowid);
    return unwrapResult(orderDomain.assign_id(provisionalOrder, order_id));
  }

  findById(order_id: number): orderDomain.Order$ | null {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE order_id = ?');
    const row = stmt.get(order_id) as any;
    return row ? this.mapToOrder(row) : null;
  }

  findAll(): orderDomain.Order$[] {
    const stmt = this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapToOrder(row));
  }

  findByCartId(cart_id: number): orderDomain.Order$ | null {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE cart_id = ?');
    const row = stmt.get(cart_id) as any;
    return row ? this.mapToOrder(row) : null;
  }

  findByStatus(status: OrderStatusString): orderDomain.Order$[] {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.mapToOrder(row));
  }

  updateStatus(order_id: number, new_status: OrderStatusString): orderDomain.Order$ | null {
    const order = this.findById(order_id);
    if (!order) {
      return null;
    }

    const updatedResult: Result<orderDomain.Order$, orderDomain.OrderError$> = (() => {
      if (new_status === 'Confirmed') return orderDomain.confirm(order);
      if (new_status === 'Cancelled') return orderDomain.cancel(order);
      if (new_status === 'Completed') return orderDomain.complete(order);
      throw new Error('Unsupported order status transition');
    })();

    const updated = unwrapResult(updatedResult);
    const stmt = this.db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = ?
      WHERE order_id = ?
    `);

    stmt.run(orderStatusToString(orderDomain.status(updated)), orderDomain.updated_at(updated), order_id);
    return updated;
  }

  private mapToOrder(row: any): orderDomain.Order$ {
    return unwrapResult(
      orderDomain.reconstitute(
        row.order_id,
        row.cart_id,
        row.product_id,
        optionFromNullableInt(row.coupon_id),
        row.quantity,
        row.paid_amount,
        row.discount_amount,
        orderStatusFromString(row.status as OrderStatusString),
        row.created_at,
        row.updated_at
      )
    );
  }
}
