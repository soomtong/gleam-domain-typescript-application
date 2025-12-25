import common.{type DateTime}

pub type CouponError {
  CouponIdMustBePositive(message: String)
  CouponCodeCannotBeEmpty(message: String)
  DiscountValueMustBePositive(message: String)
  PercentageDiscountCannotExceed100(message: String)
  PercentageDiscountMustBePositive(message: String)
  ValidUntilMustBeAfterValidFrom(message: String)
}

/// Discount type enumeration
pub type DiscountType {
  Percentage(Int)
  Fixed(Int)
}

/// Coupon status enumeration
pub type CouponStatus {
  Active
  Inactive
  Expired
}

/// Coupon aggregate
pub opaque type Coupon {
  Coupon(
    coupon_id: Int,
    code: String,
    discount_type: DiscountType,
    discount_value: Int,
    valid_from: DateTime,
    valid_until: DateTime,
    status: CouponStatus,
    created_at: DateTime,
    updated_at: DateTime,
  )
}

/// Create a new coupon
pub fn create(
  coupon_id: Int,
  code: String,
  discount_type: DiscountType,
  discount_value: Int,
  valid_from: DateTime,
  valid_until: DateTime,
) -> Result(Coupon, CouponError) {
  // Validation
  case code == "" {
    True -> Error(CouponCodeCannotBeEmpty("Coupon code cannot be empty"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case discount_value <= 0 {
      True ->
        Error(DiscountValueMustBePositive("Discount value must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case discount_type {
      Percentage(value) if value > 100 ->
        Error(PercentageDiscountCannotExceed100(
          "Percentage discount cannot exceed 100",
        ))
      Percentage(value) if value <= 0 ->
        Error(PercentageDiscountMustBePositive(
          "Percentage discount must be positive",
        ))
      _ -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case common.is_before(valid_until, valid_from) {
      True ->
        Error(ValidUntilMustBeAfterValidFrom(
          "Valid until must be after valid from",
        ))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    let now = common.now()
    let status = determine_status(valid_from, valid_until, now)

    Coupon(
      coupon_id: coupon_id,
      code: code,
      discount_type: discount_type,
      discount_value: discount_value,
      valid_from: valid_from,
      valid_until: valid_until,
      status: status,
      created_at: now,
      updated_at: now,
    )
  })
}

/// Assign persisted ID after storage
pub fn assign_id(coupon: Coupon, coupon_id: Int) -> Result(Coupon, CouponError) {
  case coupon_id <= 0 {
    True -> Error(CouponIdMustBePositive("Coupon id must be positive"))
    False -> Ok(Coupon(..coupon, coupon_id: coupon_id))
  }
}

/// Reconstitute coupon from persistence
pub fn reconstitute(
  coupon_id: Int,
  code: String,
  discount_type: DiscountType,
  discount_value: Int,
  valid_from: DateTime,
  valid_until: DateTime,
  status: CouponStatus,
  created_at: DateTime,
  updated_at: DateTime,
) -> Result(Coupon, CouponError) {
  case coupon_id <= 0 {
    True -> Error(CouponIdMustBePositive("Coupon id must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case code == "" {
      True -> Error(CouponCodeCannotBeEmpty("Coupon code cannot be empty"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case discount_value <= 0 {
      True ->
        Error(DiscountValueMustBePositive("Discount value must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case discount_type {
      Percentage(value) if value > 100 ->
        Error(PercentageDiscountCannotExceed100(
          "Percentage discount cannot exceed 100",
        ))
      Percentage(value) if value <= 0 ->
        Error(PercentageDiscountMustBePositive(
          "Percentage discount must be positive",
        ))
      _ -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case common.is_before(valid_until, valid_from) {
      True ->
        Error(ValidUntilMustBeAfterValidFrom(
          "Valid until must be after valid from",
        ))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    Coupon(
      coupon_id: coupon_id,
      code: code,
      discount_type: discount_type,
      discount_value: discount_value,
      valid_from: valid_from,
      valid_until: valid_until,
      status: status,
      created_at: created_at,
      updated_at: updated_at,
    )
  })
}

pub fn coupon_id(coupon: Coupon) -> Int {
  let Coupon(coupon_id: coupon_id, ..) = coupon
  coupon_id
}

pub fn code(coupon: Coupon) -> String {
  let Coupon(code: code, ..) = coupon
  code
}

pub fn discount_type(coupon: Coupon) -> DiscountType {
  let Coupon(discount_type: discount_type, ..) = coupon
  discount_type
}

pub fn discount_value(coupon: Coupon) -> Int {
  let Coupon(discount_value: discount_value, ..) = coupon
  discount_value
}

pub fn valid_from(coupon: Coupon) -> DateTime {
  let Coupon(valid_from: valid_from, ..) = coupon
  valid_from
}

pub fn valid_until(coupon: Coupon) -> DateTime {
  let Coupon(valid_until: valid_until, ..) = coupon
  valid_until
}

pub fn status(coupon: Coupon) -> CouponStatus {
  let Coupon(status: status, ..) = coupon
  status
}

pub fn created_at(coupon: Coupon) -> DateTime {
  let Coupon(created_at: created_at, ..) = coupon
  created_at
}

pub fn updated_at(coupon: Coupon) -> DateTime {
  let Coupon(updated_at: updated_at, ..) = coupon
  updated_at
}

/// Calculate discount amount for a given price
pub fn calculate_discount(coupon: Coupon, original_price: Int) -> Int {
  case coupon.discount_type {
    Percentage(value) -> original_price * value / 100
    Fixed(value) -> {
      case value > original_price {
        True -> original_price
        False -> value
      }
    }
  }
}

/// Apply discount to price and return discounted price
pub fn apply_discount(coupon: Coupon, original_price: Int) -> Int {
  let discount = calculate_discount(coupon, original_price)
  original_price - discount
}

/// Check if coupon is valid for use
pub fn is_valid(coupon: Coupon) -> Bool {
  case coupon.status {
    Active -> {
      let now = common.now()
      common.is_before(coupon.valid_from, now)
      || coupon.valid_from == now
      && {
        common.is_before(now, coupon.valid_until) || now == coupon.valid_until
      }
    }
    _ -> False
  }
}

/// Update coupon status
pub fn change_status(coupon: Coupon, new_status: CouponStatus) -> Coupon {
  Coupon(..coupon, status: new_status, updated_at: common.now())
}

/// Check and update coupon status based on current time
pub fn update_status_by_time(coupon: Coupon) -> Coupon {
  let now = common.now()
  let new_status = determine_status(coupon.valid_from, coupon.valid_until, now)

  case new_status == coupon.status {
    True -> coupon
    False -> Coupon(..coupon, status: new_status, updated_at: now)
  }
}

// Helper function to determine status based on validity period
fn determine_status(
  valid_from: DateTime,
  valid_until: DateTime,
  now: DateTime,
) -> CouponStatus {
  case common.is_before(now, valid_from), common.is_after(now, valid_until) {
    True, _ -> Inactive
    _, True -> Expired
    False, False -> Active
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
