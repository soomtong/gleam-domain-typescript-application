import coupon
import gleeunit/should

// Test constants - Unix timestamps in milliseconds
const far_past = 946_684_800_000

// 2000-01-01T00:00:00.000Z

const far_future = 4_102_444_800_000

// 2100-01-01T00:00:00.000Z

pub fn create_percentage_discount_cannot_exceed_100_test() {
  let result =
    coupon.create(
      0,
      "P101",
      coupon.Percentage(101),
      101,
      far_past,
      far_future,
    )

  let error = should.be_error(result)
  case error {
    coupon.PercentageDiscountCannotExceed100(_) -> Nil
    _ -> should.fail()
  }
}

pub fn calculate_discount_percentage_truncates_test() {
  let coupon =
    coupon.create(0, "P15", coupon.Percentage(15), 15, far_past, far_future)
    |> should.be_ok

  should.equal(coupon.calculate_discount(coupon, 99), 14)
}
