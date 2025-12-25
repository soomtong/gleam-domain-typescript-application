import gleeunit/should
import product

// Test constants - Unix timestamps in milliseconds
const far_past = 946_684_800_000

// 2000-01-01T00:00:00.000Z

const far_future = 4_102_444_800_000

// 2100-01-01T00:00:00.000Z

pub fn create_title_cannot_be_empty_test() {
  let result =
    product.create(0, "", 100, 1, far_past, far_future)

  let error = should.be_error(result)
  case error {
    product.TitleCannotBeEmpty(_) -> Nil
    _ -> should.fail()
  }
}

pub fn decrease_stock_to_zero_sets_out_of_stock_test() {
  let product =
    product.create(0, "Test product", 100, 1, far_past, far_future)
    |> should.be_ok

  let updated = product.decrease_stock(product, 1) |> should.be_ok
  should.equal(product.stock(updated), 0)

  case product.status(updated) {
    product.OutOfStock -> Nil
    _ -> should.fail()
  }
}
