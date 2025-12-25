import type { Database } from 'bun:sqlite';

import * as cartDomain from '@core/domain/cart';

import {
  cartStatusFromString,
  cartStatusToString,
  nullableIntFromOption,
  optionFromNullableInt,
  unwrapResult,
  type CartStatusString,
} from '../../domain/core-domain';

export class CartRepository {
  constructor(private db: Database) {}

  create(data: {
    product_id: number;
    coupon_id?: number | null;
    quantity: number;
    expired_at: number;
    keep_until: number;
  }): cartDomain.Cart$ {
    const provisionalCart = unwrapResult(
      cartDomain.create(
        0,
        data.product_id,
        optionFromNullableInt(data.coupon_id ?? null),
        data.quantity,
        data.expired_at,
        data.keep_until
      )
    );

    const status = cartStatusToString(cartDomain.status(provisionalCart));

    const stmt = this.db.prepare(`
      INSERT INTO carts (product_id, coupon_id, quantity, expired_at, keep_until, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cartDomain.product_id(provisionalCart),
      nullableIntFromOption(cartDomain.coupon_id(provisionalCart)),
      cartDomain.quantity(provisionalCart),
      cartDomain.expired_at(provisionalCart),
      cartDomain.keep_until(provisionalCart),
      status,
      cartDomain.created_at(provisionalCart),
      cartDomain.updated_at(provisionalCart)
    );

    const cart_id = Number(result.lastInsertRowid);
    return unwrapResult(cartDomain.assign_id(provisionalCart, cart_id));
  }

  findById(cart_id: number): cartDomain.Cart$ | null {
    const stmt = this.db.prepare(`
      SELECT * FROM carts WHERE cart_id = ?
    `);

    const row = stmt.get(cart_id) as any;
    return row ? this.mapToCart(row) : null;
  }

  findAll(): cartDomain.Cart$[] {
    const stmt = this.db.prepare(`
      SELECT * FROM carts ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapToCart(row));
  }

  findActive(): cartDomain.Cart$[] {
    return this.findAll().filter(cart => cartStatusToString(cartDomain.status(cart)) === 'Active');
  }

  updateCoupon(cart_id: number, coupon_id: number | null): cartDomain.Cart$ | null {
    const cart = this.findById(cart_id);
    if (!cart) return null;

    const updated = unwrapResult(
      coupon_id === null ? cartDomain.remove_coupon(cart) : cartDomain.add_coupon(cart, coupon_id)
    );

    const stmt = this.db.prepare(`
      UPDATE carts
      SET coupon_id = ?, updated_at = ?
      WHERE cart_id = ?
    `);

    stmt.run(nullableIntFromOption(cartDomain.coupon_id(updated)), cartDomain.updated_at(updated), cart_id);
    return updated;
  }

  updateQuantity(cart_id: number, quantity: number): cartDomain.Cart$ | null {
    const cart = this.findById(cart_id);
    if (!cart) return null;

    const updated = unwrapResult(cartDomain.update_quantity(cart, quantity));

    const stmt = this.db.prepare(`
      UPDATE carts
      SET quantity = ?, updated_at = ?
      WHERE cart_id = ?
    `);

    stmt.run(cartDomain.quantity(updated), cartDomain.updated_at(updated), cart_id);
    return updated;
  }

  updateStatus(cart_id: number, status: CartStatusString): cartDomain.Cart$ | null {
    const cart = this.findById(cart_id);
    if (!cart) return null;

    let updated: cartDomain.Cart$;
    if (status === 'CheckedOut') {
      updated = unwrapResult(cartDomain.checkout(cart));
    } else if (status === 'Expired') {
      if (!(cartDomain.status(cart) instanceof cartDomain.Active)) {
        throw new Error('Only active carts can be expired');
      }
      updated = cartDomain.mark_as_expired(cart);
    } else {
      throw new Error('Unsupported cart status transition');
    }

    const stmt = this.db.prepare(`
      UPDATE carts
      SET status = ?, updated_at = ?
      WHERE cart_id = ?
    `);

    stmt.run(cartStatusToString(cartDomain.status(updated)), cartDomain.updated_at(updated), cart_id);
    return updated;
  }

  private normalizeCart(cart: cartDomain.Cart$): cartDomain.Cart$ {
    if (cartDomain.status(cart) instanceof cartDomain.Active && cartDomain.is_expired(cart)) {
      const expired = cartDomain.mark_as_expired(cart);
      const stmt = this.db.prepare(`
        UPDATE carts
        SET status = ?, updated_at = ?
        WHERE cart_id = ?
      `);
      stmt.run(
        cartStatusToString(cartDomain.status(expired)),
        cartDomain.updated_at(expired),
        cartDomain.cart_id(expired)
      );
      return expired;
    }

    return cart;
  }

  private mapToCart(row: any): cartDomain.Cart$ {
    const status = cartStatusFromString(row.status as CartStatusString);
    const cart = unwrapResult(
      cartDomain.reconstitute(
        row.cart_id,
        row.product_id,
        optionFromNullableInt(row.coupon_id),
        row.quantity,
        row.expired_at,
        row.keep_until,
        status,
        row.created_at,
        row.updated_at
      )
    );

    return this.normalizeCart(cart);
  }
}
