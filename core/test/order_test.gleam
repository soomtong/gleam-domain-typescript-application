import gleam/option
import gleeunit/should
import order

pub fn cannot_confirm_completed_order_test() {
  let order =
    order.create(0, 1, 1, option.None, 1, 100, 0)
    |> should.be_ok
    |> order.confirm
    |> should.be_ok
    |> order.complete
    |> should.be_ok

  let result = order.confirm(order)
  let error = should.be_error(result)

  case error {
    order.CannotConfirmCompletedOrder(_) -> Nil
    _ -> should.fail()
  }
}
