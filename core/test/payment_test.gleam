import gleeunit/should
import payment

pub fn cannot_complete_failed_payment_test() {
  let payment =
    payment.create(0, 1, 100)
    |> should.be_ok
    |> payment.fail
    |> should.be_ok

  let result = payment.complete(payment)
  let error = should.be_error(result)

  case error {
    payment.CannotCompleteFailedPayment(_) -> Nil
    _ -> should.fail()
  }
}
