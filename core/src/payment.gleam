import common.{type DateTime}

pub type PaymentError {
  PaymentIdMustBePositive(message: String)
  OrderIdMustBePositive(message: String)
  PaymentAmountCannotBeNegative(message: String)
  PaymentAlreadyCompleted(message: String)
  CannotCompleteFailedPayment(message: String)
  CannotCompleteRefundedPayment(message: String)
  CannotFailCompletedPayment(message: String)
  PaymentAlreadyFailed(message: String)
  CannotFailRefundedPayment(message: String)
  CannotRefundPendingPayment(message: String)
  CannotRefundFailedPayment(message: String)
  PaymentAlreadyRefunded(message: String)
}

/// Payment status enumeration
pub type PaymentStatus {
  Pending
  Completed
  Failed
  Refunded
}

/// Payment aggregate
pub opaque type Payment {
  Payment(
    payment_id: Int,
    order_id: Int,
    paid_at: DateTime,
    amount: Int,
    status: PaymentStatus,
    created_at: DateTime,
    updated_at: DateTime,
  )
}

/// Create a new payment
pub fn create(
  payment_id: Int,
  order_id: Int,
  amount: Int,
) -> Result(Payment, PaymentError) {
  // Validation
  case amount < 0 {
    True ->
      Error(PaymentAmountCannotBeNegative("Payment amount cannot be negative"))
    False -> {
      let now = common.now()

      Ok(Payment(
        payment_id: payment_id,
        order_id: order_id,
        paid_at: now,
        amount: amount,
        status: Pending,
        created_at: now,
        updated_at: now,
      ))
    }
  }
}

/// Assign persisted ID after storage
pub fn assign_id(
  payment: Payment,
  payment_id: Int,
) -> Result(Payment, PaymentError) {
  case payment_id <= 0 {
    True -> Error(PaymentIdMustBePositive("Payment id must be positive"))
    False -> Ok(Payment(..payment, payment_id: payment_id))
  }
}

/// Reconstitute payment from persistence
pub fn reconstitute(
  payment_id: Int,
  order_id: Int,
  paid_at: DateTime,
  amount: Int,
  status: PaymentStatus,
  created_at: DateTime,
  updated_at: DateTime,
) -> Result(Payment, PaymentError) {
  case payment_id <= 0 {
    True -> Error(PaymentIdMustBePositive("Payment id must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case order_id <= 0 {
      True -> Error(OrderIdMustBePositive("Order id must be positive"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case amount < 0 {
      True ->
        Error(PaymentAmountCannotBeNegative("Payment amount cannot be negative"))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    Payment(
      payment_id: payment_id,
      order_id: order_id,
      paid_at: paid_at,
      amount: amount,
      status: status,
      created_at: created_at,
      updated_at: updated_at,
    )
  })
}

pub fn payment_id(payment: Payment) -> Int {
  let Payment(payment_id: payment_id, ..) = payment
  payment_id
}

pub fn order_id(payment: Payment) -> Int {
  let Payment(order_id: order_id, ..) = payment
  order_id
}

pub fn paid_at(payment: Payment) -> DateTime {
  let Payment(paid_at: paid_at, ..) = payment
  paid_at
}

pub fn amount(payment: Payment) -> Int {
  let Payment(amount: amount, ..) = payment
  amount
}

pub fn status(payment: Payment) -> PaymentStatus {
  let Payment(status: status, ..) = payment
  status
}

pub fn created_at(payment: Payment) -> DateTime {
  let Payment(created_at: created_at, ..) = payment
  created_at
}

pub fn updated_at(payment: Payment) -> DateTime {
  let Payment(updated_at: updated_at, ..) = payment
  updated_at
}

/// Mark payment as completed
pub fn complete(payment: Payment) -> Result(Payment, PaymentError) {
  case payment.status {
    Pending ->
      Ok(Payment(..payment, status: Completed, updated_at: common.now()))
    Completed -> Error(PaymentAlreadyCompleted("Payment already completed"))
    Failed ->
      Error(CannotCompleteFailedPayment("Cannot complete failed payment"))
    Refunded ->
      Error(CannotCompleteRefundedPayment("Cannot complete refunded payment"))
  }
}

/// Mark payment as failed
pub fn fail(payment: Payment) -> Result(Payment, PaymentError) {
  case payment.status {
    Pending -> Ok(Payment(..payment, status: Failed, updated_at: common.now()))
    Completed ->
      Error(CannotFailCompletedPayment("Cannot fail completed payment"))
    Failed -> Error(PaymentAlreadyFailed("Payment already failed"))
    Refunded -> Error(CannotFailRefundedPayment("Cannot fail refunded payment"))
  }
}

/// Refund a completed payment
pub fn refund(payment: Payment) -> Result(Payment, PaymentError) {
  case payment.status {
    Completed ->
      Ok(Payment(..payment, status: Refunded, updated_at: common.now()))
    Pending ->
      Error(CannotRefundPendingPayment("Cannot refund pending payment"))
    Failed -> Error(CannotRefundFailedPayment("Cannot refund failed payment"))
    Refunded -> Error(PaymentAlreadyRefunded("Payment already refunded"))
  }
}

/// Check if payment is successful
pub fn is_successful(payment: Payment) -> Bool {
  case payment.status {
    Completed -> True
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

/// Check if payment can be retried
pub fn can_retry(payment: Payment) -> Bool {
  case payment.status {
    Failed -> True
    _ -> False
  }
}

/// Check if payment is final (completed or refunded)
pub fn is_final(payment: Payment) -> Bool {
  case payment.status {
    Completed -> True
    Refunded -> True
    _ -> False
  }
}
