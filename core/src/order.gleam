import common.{type DateTime}
import gleam/option.{type Option}

pub type OrderError {
  OrderIdMustBePositive(message: String)
  CartIdMustBePositive(message: String)
  ProductIdMustBePositive(message: String)
  QuantityMustBePositive(message: String)
  PaidAmountCannotBeNegative(message: String)
  DiscountAmountCannotBeNegative(message: String)
  CannotConfirmCancelledOrder(message: String)
  OrderAlreadyConfirmed(message: String)
  CannotConfirmCompletedOrder(message: String)
  OrderAlreadyCancelled(message: String)
  CannotCancelCompletedOrder(message: String)
  CannotCompleteUnconfirmedOrder(message: String)
  CannotCompleteCancelledOrder(message: String)
  OrderAlreadyCompleted(message: String)
  PriceCannotBeNegative(message: String)
}

/// Order status enumeration
pub type OrderStatus {
  Pending
  Confirmed
  Cancelled
  Completed
}

/// Order aggregate
pub opaque type Order {
  Order(
    order_id: Int,
    cart_id: Int,
    product_id: Int,
    coupon_id: Option(Int),
    quantity: Int,
    paid_amount: Int,
    discount_amount: Int,
    status: OrderStatus,
    created_at: DateTime,
    updated_at: DateTime,
  )
}

/// Create a new order
pub fn create(
  order_id: Int,
  cart_id: Int,
  product_id: Int,
  coupon_id: Option(Int),
  quantity: Int,
  paid_amount: Int,
  discount_amount: Int,
) -> Result(Order, OrderError) {
  // Validation
  case quantity <= 0 {
    True -> Error(QuantityMustBePositive("Quantity must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case paid_amount < 0 {
      True ->
        Error(PaidAmountCannotBeNegative("Paid amount cannot be negative"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case discount_amount < 0 {
      True ->
        Error(DiscountAmountCannotBeNegative(
          "Discount amount cannot be negative",
        ))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    let now = common.now()

    Order(
      order_id: order_id,
      cart_id: cart_id,
      product_id: product_id,
      coupon_id: coupon_id,
      quantity: quantity,
      paid_amount: paid_amount,
      discount_amount: discount_amount,
      status: Pending,
      created_at: now,
      updated_at: now,
    )
  })
}

/// Assign persisted ID after storage
pub fn assign_id(order: Order, order_id: Int) -> Result(Order, OrderError) {
  case order_id <= 0 {
    True -> Error(OrderIdMustBePositive("Order id must be positive"))
    False -> Ok(Order(..order, order_id: order_id))
  }
}

/// Reconstitute order from persistence
pub fn reconstitute(
  order_id: Int,
  cart_id: Int,
  product_id: Int,
  coupon_id: Option(Int),
  quantity: Int,
  paid_amount: Int,
  discount_amount: Int,
  status: OrderStatus,
  created_at: DateTime,
  updated_at: DateTime,
) -> Result(Order, OrderError) {
  case order_id <= 0 {
    True -> Error(OrderIdMustBePositive("Order id must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case cart_id <= 0 {
      True -> Error(CartIdMustBePositive("Cart id must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case product_id <= 0 {
      True -> Error(ProductIdMustBePositive("Product id must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case quantity <= 0 {
      True -> Error(QuantityMustBePositive("Quantity must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case paid_amount < 0 {
      True ->
        Error(PaidAmountCannotBeNegative("Paid amount cannot be negative"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case discount_amount < 0 {
      True ->
        Error(DiscountAmountCannotBeNegative(
          "Discount amount cannot be negative",
        ))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    Order(
      order_id: order_id,
      cart_id: cart_id,
      product_id: product_id,
      coupon_id: coupon_id,
      quantity: quantity,
      paid_amount: paid_amount,
      discount_amount: discount_amount,
      status: status,
      created_at: created_at,
      updated_at: updated_at,
    )
  })
}

pub fn order_id(order: Order) -> Int {
  let Order(order_id: order_id, ..) = order
  order_id
}

pub fn cart_id(order: Order) -> Int {
  let Order(cart_id: cart_id, ..) = order
  cart_id
}

pub fn product_id(order: Order) -> Int {
  let Order(product_id: product_id, ..) = order
  product_id
}

pub fn coupon_id(order: Order) -> Option(Int) {
  let Order(coupon_id: coupon_id, ..) = order
  coupon_id
}

pub fn quantity(order: Order) -> Int {
  let Order(quantity: quantity, ..) = order
  quantity
}

pub fn paid_amount(order: Order) -> Int {
  let Order(paid_amount: paid_amount, ..) = order
  paid_amount
}

pub fn discount_amount(order: Order) -> Int {
  let Order(discount_amount: discount_amount, ..) = order
  discount_amount
}

pub fn status(order: Order) -> OrderStatus {
  let Order(status: status, ..) = order
  status
}

pub fn created_at(order: Order) -> DateTime {
  let Order(created_at: created_at, ..) = order
  created_at
}

pub fn updated_at(order: Order) -> DateTime {
  let Order(updated_at: updated_at, ..) = order
  updated_at
}

/// Confirm order
pub fn confirm(order: Order) -> Result(Order, OrderError) {
  case order.status {
    Pending -> Ok(Order(..order, status: Confirmed, updated_at: common.now()))
    Cancelled ->
      Error(CannotConfirmCancelledOrder("Cannot confirm cancelled order"))
    Confirmed -> Error(OrderAlreadyConfirmed("Order already confirmed"))
    Completed ->
      Error(CannotConfirmCompletedOrder("Cannot confirm completed order"))
  }
}

/// Cancel order
pub fn cancel(order: Order) -> Result(Order, OrderError) {
  case order.status {
    Pending -> Ok(Order(..order, status: Cancelled, updated_at: common.now()))
    Confirmed -> Ok(Order(..order, status: Cancelled, updated_at: common.now()))
    Cancelled -> Error(OrderAlreadyCancelled("Order already cancelled"))
    Completed ->
      Error(CannotCancelCompletedOrder("Cannot cancel completed order"))
  }
}

/// Complete order (after payment)
pub fn complete(order: Order) -> Result(Order, OrderError) {
  case order.status {
    Confirmed -> Ok(Order(..order, status: Completed, updated_at: common.now()))
    Pending ->
      Error(CannotCompleteUnconfirmedOrder(
        "Cannot complete order that is not confirmed",
      ))
    Cancelled ->
      Error(CannotCompleteCancelledOrder("Cannot complete cancelled order"))
    Completed -> Error(OrderAlreadyCompleted("Order already completed"))
  }
}

/// Calculate total amount (before discount)
pub fn calculate_total_before_discount(
  price: Int,
  quantity: Int,
) -> Result(Int, OrderError) {
  case price < 0 {
    True -> Error(PriceCannotBeNegative("Price cannot be negative"))
    False ->
      case quantity <= 0 {
        True -> Error(QuantityMustBePositive("Quantity must be positive"))
        False -> Ok(price * quantity)
      }
  }
}

/// Check if order can be modified
pub fn can_modify(order: Order) -> Bool {
  case order.status {
    Pending -> True
    _ -> False
  }
}

/// Check if order is final (completed or cancelled)
pub fn is_final(order: Order) -> Bool {
  case order.status {
    Completed -> True
    Cancelled -> True
    _ -> False
  }
}

// Helper functions for Result chaining
fn result_and(result: Result(a, e), next: fn(a) -> Result(b, e)) -> Result(b, e) {
  case result {
    Ok(value) -> next(value)
    Error(err) -> Error(err)
  }
}

fn result_map(result: Result(a, e), mapper: fn(a) -> b) -> Result(b, e) {
  case result {
    Ok(value) -> Ok(mapper(value))
    Error(err) -> Error(err)
  }
}
