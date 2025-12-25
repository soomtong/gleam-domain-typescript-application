import { Database } from 'bun:sqlite';
import { getDatabase } from '../../config/database';

import * as paymentDomain from '@core/domain/payment';
import type { Result } from '@core/domain/gleam';

import {
  paymentStatusFromString,
  paymentStatusToString,
  unwrapResult,
  type PaymentStatusString,
} from '../../domain/core-domain';

export interface CreatePaymentData {
  order_id: number;
  amount: number;
}

export class PaymentRepository {
  constructor(private db: Database = getDatabase()) {}

  create(data: CreatePaymentData): paymentDomain.Payment$ {
    const provisionalPayment = unwrapResult(paymentDomain.create(0, data.order_id, data.amount));

    const stmt = this.db.prepare(`
      INSERT INTO payments (
        order_id, paid_at, amount, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      paymentDomain.order_id(provisionalPayment),
      paymentDomain.paid_at(provisionalPayment),
      paymentDomain.amount(provisionalPayment),
      paymentStatusToString(paymentDomain.status(provisionalPayment)),
      paymentDomain.created_at(provisionalPayment),
      paymentDomain.updated_at(provisionalPayment)
    );

    const payment_id = Number(result.lastInsertRowid);
    return unwrapResult(paymentDomain.assign_id(provisionalPayment, payment_id));
  }

  findById(payment_id: number): paymentDomain.Payment$ | null {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE payment_id = ?');
    const row = stmt.get(payment_id) as any;
    return row ? this.mapToPayment(row) : null;
  }

  findAll(): paymentDomain.Payment$[] {
    const stmt = this.db.prepare('SELECT * FROM payments ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapToPayment(row));
  }

  findByOrderId(order_id: number): paymentDomain.Payment$ | null {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE order_id = ?');
    const row = stmt.get(order_id) as any;
    return row ? this.mapToPayment(row) : null;
  }

  findByStatus(status: PaymentStatusString): paymentDomain.Payment$[] {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.mapToPayment(row));
  }

  updateStatus(payment_id: number, new_status: PaymentStatusString): paymentDomain.Payment$ | null {
    const payment = this.findById(payment_id);
    if (!payment) {
      return null;
    }

    const updatedResult: Result<paymentDomain.Payment$, paymentDomain.PaymentError$> = (() => {
      if (new_status === 'Completed') return paymentDomain.complete(payment);
      if (new_status === 'Failed') return paymentDomain.fail(payment);
      if (new_status === 'Refunded') return paymentDomain.refund(payment);
      throw new Error('Unsupported payment status transition');
    })();

    const updated = unwrapResult(updatedResult);
    const stmt = this.db.prepare(`
      UPDATE payments
      SET status = ?, updated_at = ?
      WHERE payment_id = ?
    `);

    stmt.run(
      paymentStatusToString(paymentDomain.status(updated)),
      paymentDomain.updated_at(updated),
      payment_id
    );
    return updated;
  }

  private mapToPayment(row: any): paymentDomain.Payment$ {
    return unwrapResult(
      paymentDomain.reconstitute(
        row.payment_id,
        row.order_id,
        row.paid_at,
        row.amount,
        paymentStatusFromString(row.status as PaymentStatusString),
        row.created_at,
        row.updated_at
      )
    );
  }
}
