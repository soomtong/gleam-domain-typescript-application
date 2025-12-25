import cart
import gleam/option
import gleeunit/should

// Test constants - Unix timestamps in milliseconds
const far_past = 946_684_800_000

// 2000-01-01T00:00:00.000Z

const far_future = 4_102_444_800_000

// 2100-01-01T00:00:00.000Z

const far_future_plus_1 = 4_102_531_200_000

// 2100-01-02T00:00:00.000Z

pub fn create_quantity_must_be_positive_test() {
  let result =
    cart.create(0, 1, option.None, 0, far_future, far_future_plus_1)

  let error = should.be_error(result)
  case error {
    cart.QuantityMustBePositive(_) -> Nil
    _ -> should.fail()
  }
}

pub fn add_coupon_coupon_id_must_be_positive_test() {
  let cart =
    cart.create(0, 1, option.None, 1, far_future, far_future_plus_1)
    |> should.be_ok

  let result = cart.add_coupon(cart, 0)

  let error = should.be_error(result)
  case error {
    cart.CouponIdMustBePositive(_) -> Nil
    _ -> should.fail()
  }
}

pub fn checkout_expired_cart_is_rejected_test() {
  let active_cart =
    cart.create(0, 1, option.None, 1, far_past, far_future_plus_1)
    |> should.be_ok

  let expired_cart = cart.mark_as_expired(active_cart)
  let result = cart.checkout(expired_cart)

  let error = should.be_error(result)
  case error {
    cart.CannotCheckoutExpiredCart(_) -> Nil
    _ -> should.fail()
  }
}
