import common.{type DateTime}
import gleam/option.{type Option}

pub type CartError {
  QuantityMustBePositive(message: String)
  ProductIdMustBePositive(message: String)
  CartIdMustBePositive(message: String)
  CouponIdMustBePositive(message: String)
  KeepUntilMustBeAfterExpiredAt(message: String)
  CannotModifyCheckedOutCart(message: String)
  CannotModifyExpiredCart(message: String)
  CannotCheckoutExpiredCart(message: String)
  CartAlreadyCheckedOut(message: String)
}

/// Cart status enumeration
pub type CartStatus {
  Active
  Expired
  CheckedOut
}

/// Cart aggregate
pub opaque type Cart {
  Cart(
    cart_id: Int,
    product_id: Int,
    coupon_id: Option(Int),
    quantity: Int,
    expired_at: DateTime,
    keep_until: DateTime,
    status: CartStatus,
    created_at: DateTime,
    updated_at: DateTime,
  )
}

/// Create a new cart
pub fn create(
  cart_id: Int,
  product_id: Int,
  coupon_id: Option(Int),
  quantity: Int,
  expired_at: DateTime,
  keep_until: DateTime,
) -> Result(Cart, CartError) {
  // Validation
  case quantity <= 0 {
    True -> Error(QuantityMustBePositive("Quantity must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case product_id <= 0 {
      True -> Error(ProductIdMustBePositive("Product id must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case common.is_before(keep_until, expired_at) {
      True ->
        Error(KeepUntilMustBeAfterExpiredAt(
          "Keep until must be after expired at",
        ))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    let now = common.now()
    let status = case common.is_after(now, expired_at) {
      True -> Expired
      False -> Active
    }

    Cart(
      cart_id: cart_id,
      product_id: product_id,
      coupon_id: coupon_id,
      quantity: quantity,
      expired_at: expired_at,
      keep_until: keep_until,
      status: status,
      created_at: now,
      updated_at: now,
    )
  })
}

/// Assign persisted ID after storage
pub fn assign_id(cart: Cart, cart_id: Int) -> Result(Cart, CartError) {
  case cart_id <= 0 {
    True -> Error(CartIdMustBePositive("Cart id must be positive"))
    False -> Ok(Cart(..cart, cart_id: cart_id))
  }
}

/// Reconstitute cart from persistence
pub fn reconstitute(
  cart_id: Int,
  product_id: Int,
  coupon_id: Option(Int),
  quantity: Int,
  expired_at: DateTime,
  keep_until: DateTime,
  status: CartStatus,
  created_at: DateTime,
  updated_at: DateTime,
) -> Result(Cart, CartError) {
  case cart_id <= 0 {
    True -> Error(CartIdMustBePositive("Cart id must be positive"))
    False -> Ok(Nil)
  }
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
    case common.is_before(keep_until, expired_at) {
      True ->
        Error(KeepUntilMustBeAfterExpiredAt(
          "Keep until must be after expired at",
        ))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    Cart(
      cart_id: cart_id,
      product_id: product_id,
      coupon_id: coupon_id,
      quantity: quantity,
      expired_at: expired_at,
      keep_until: keep_until,
      status: status,
      created_at: created_at,
      updated_at: updated_at,
    )
  })
}

pub fn cart_id(cart: Cart) -> Int {
  let Cart(cart_id: cart_id, ..) = cart
  cart_id
}

pub fn product_id(cart: Cart) -> Int {
  let Cart(product_id: product_id, ..) = cart
  product_id
}

pub fn coupon_id(cart: Cart) -> Option(Int) {
  let Cart(coupon_id: coupon_id, ..) = cart
  coupon_id
}

pub fn quantity(cart: Cart) -> Int {
  let Cart(quantity: quantity, ..) = cart
  quantity
}

pub fn expired_at(cart: Cart) -> DateTime {
  let Cart(expired_at: expired_at, ..) = cart
  expired_at
}

pub fn keep_until(cart: Cart) -> DateTime {
  let Cart(keep_until: keep_until, ..) = cart
  keep_until
}

pub fn status(cart: Cart) -> CartStatus {
  let Cart(status: status, ..) = cart
  status
}

pub fn created_at(cart: Cart) -> DateTime {
  let Cart(created_at: created_at, ..) = cart
  created_at
}

pub fn updated_at(cart: Cart) -> DateTime {
  let Cart(updated_at: updated_at, ..) = cart
  updated_at
}

/// Add or update coupon in cart
pub fn add_coupon(cart: Cart, coupon_id: Int) -> Result(Cart, CartError) {
  case coupon_id <= 0 {
    True -> Error(CouponIdMustBePositive("Coupon id must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case cart.status {
      CheckedOut ->
        Error(CannotModifyCheckedOutCart("Cannot modify checked out cart"))
      Expired -> Error(CannotModifyExpiredCart("Cannot modify expired cart"))
      Active ->
        Ok(
          Cart(
            ..cart,
            coupon_id: option.Some(coupon_id),
            updated_at: common.now(),
          ),
        )
    }
  })
}

/// Remove coupon from cart
pub fn remove_coupon(cart: Cart) -> Result(Cart, CartError) {
  case cart.status {
    CheckedOut ->
      Error(CannotModifyCheckedOutCart("Cannot modify checked out cart"))
    Expired -> Error(CannotModifyExpiredCart("Cannot modify expired cart"))
    Active -> Ok(Cart(..cart, coupon_id: option.None, updated_at: common.now()))
  }
}

/// Update cart quantity
pub fn update_quantity(cart: Cart, new_quantity: Int) -> Result(Cart, CartError) {
  case cart.status {
    CheckedOut ->
      Error(CannotModifyCheckedOutCart("Cannot modify checked out cart"))
    Expired -> Error(CannotModifyExpiredCart("Cannot modify expired cart"))
    Active ->
      case new_quantity <= 0 {
        True -> Error(QuantityMustBePositive("Quantity must be positive"))
        False ->
          Ok(Cart(..cart, quantity: new_quantity, updated_at: common.now()))
      }
  }
}

/// Check if cart is expired
pub fn is_expired(cart: Cart) -> Bool {
  case cart.status {
    Expired -> True
    _ -> common.is_after(common.now(), cart.expired_at)
  }
}

/// Mark cart as expired
pub fn mark_as_expired(cart: Cart) -> Cart {
  Cart(..cart, status: Expired, updated_at: common.now())
}

/// Mark cart as checked out
pub fn checkout(cart: Cart) -> Result(Cart, CartError) {
  case cart.status {
    Expired -> Error(CannotCheckoutExpiredCart("Cannot checkout expired cart"))
    CheckedOut -> Error(CartAlreadyCheckedOut("Cart already checked out"))
    Active -> Ok(Cart(..cart, status: CheckedOut, updated_at: common.now()))
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
