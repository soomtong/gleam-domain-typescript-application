import { Database } from 'bun:sqlite';
import { getDatabase } from '../config/database';
import { CartRepository } from '../db/repositories/cart.repository';
import { ProductRepository } from '../db/repositories/product.repository';
import { CouponRepository } from '../db/repositories/coupon.repository';
import { OrderRepository } from '../db/repositories/order.repository';

import * as cartDomain from '@core/domain/cart';
import * as productDomain from '@core/domain/product';
import * as couponDomain from '@core/domain/coupon';
import * as orderDomain from '@core/domain/order';

import {
  couponStatusToString,
  nullableIntFromOption,
  orderStatusToString,
  DomainError,
  unwrapResult,
  type OrderStatusString,
} from '../domain/core-domain';
import { NotFoundError } from './app-errors';

export interface OrderSnapshot {
  order_id: number;
  cart_id: number;
  product_id: number;
  coupon_id: number | null;
  quantity: number;
  paid_amount: number;
  discount_amount: number;
  status: OrderStatusString;
  created_at: number;
  updated_at: number;
}

export interface CheckoutResult {
  order: OrderSnapshot;
  cart_id: number;
  product_id: number;
  quantity: number;
  original_amount: number;
  discount_amount: number;
  paid_amount: number;
  coupon_code?: string;
}

export class CheckoutCartUseCase {
  private readonly db: Database;
  private cartRepo: CartRepository;
  private productRepo: ProductRepository;
  private couponRepo: CouponRepository;
  private orderRepo: OrderRepository;

  constructor(db: Database = getDatabase()) {
    this.db = db;
    this.cartRepo = new CartRepository(this.db);
    this.productRepo = new ProductRepository(this.db);
    this.couponRepo = new CouponRepository(this.db);
    this.orderRepo = new OrderRepository(this.db);
  }

  execute(cart_id: number): CheckoutResult {
    // Use transaction to ensure atomicity
    const transaction = this.db.transaction(() => {
      // 1. Get cart and validate
      const cart = this.cartRepo.findById(cart_id);
      if (!cart) {
        throw new NotFoundError('Cart not found');
      }
      unwrapResult(cartDomain.checkout(cart));

      // 2. Get product and validate stock
      const product = this.productRepo.findById(cartDomain.product_id(cart));
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (!productDomain.is_available(product)) {
        throw new DomainError('Product is out of stock');
      }

      // 3. Calculate amount
      const original_amount = unwrapResult(
        orderDomain.calculate_total_before_discount(
          productDomain.price(product),
          cartDomain.quantity(cart)
        )
      );
      let discount_amount = 0;
      let coupon_code: string | undefined;
      const coupon_id = nullableIntFromOption(cartDomain.coupon_id(cart));

      // 4. Apply coupon if exists
      if (coupon_id !== null) {
        const coupon = this.couponRepo.findById(coupon_id);
        if (!coupon) {
          throw new NotFoundError('Coupon not found');
        }

        const status = couponStatusToString(couponDomain.status(coupon));
        if (status !== 'Active' || !couponDomain.is_valid(coupon)) {
          throw new DomainError(`Coupon is ${status.toLowerCase()}`);
        }

        discount_amount = couponDomain.calculate_discount(coupon, original_amount);

        coupon_code = couponDomain.code(coupon);
      }

      const paid_amount = original_amount - discount_amount;

      // 5. Decrease product stock
      const decreasedProduct = unwrapResult(
        productDomain.decrease_stock(product, cartDomain.quantity(cart))
      );
      this.productRepo.updateStock(
        productDomain.product_id(product),
        productDomain.stock(decreasedProduct)
      );

      // 6. Create order
      const order = this.orderRepo.create({
        cart_id: cartDomain.cart_id(cart),
        product_id: cartDomain.product_id(cart),
        coupon_id,
        quantity: cartDomain.quantity(cart),
        paid_amount: paid_amount,
        discount_amount: discount_amount,
      });

      // 7. Mark cart as checked out
      this.cartRepo.updateStatus(cartDomain.cart_id(cart), 'CheckedOut');

      const orderSnapshot: OrderSnapshot = {
        order_id: orderDomain.order_id(order),
        cart_id: orderDomain.cart_id(order),
        product_id: orderDomain.product_id(order),
        coupon_id: nullableIntFromOption(orderDomain.coupon_id(order)),
        quantity: orderDomain.quantity(order),
        paid_amount: orderDomain.paid_amount(order),
        discount_amount: orderDomain.discount_amount(order),
        status: orderStatusToString(orderDomain.status(order)),
        created_at: orderDomain.created_at(order),
        updated_at: orderDomain.updated_at(order),
      };

      return {
        order: orderSnapshot,
        cart_id: cartDomain.cart_id(cart),
        product_id: cartDomain.product_id(cart),
        quantity: cartDomain.quantity(cart),
        original_amount,
        discount_amount,
        paid_amount,
        coupon_code,
      };
    });

    return transaction();
  }
}
