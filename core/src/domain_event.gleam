import common.{type DateTime}
import coupon.{type DiscountType}

/// Domain events for all aggregates
pub type DomainEvent {
  // Product Events
  ProductCreated(product_id: Int, title: String, price: Int, stock: Int)
  ProductStockUpdated(product_id: Int, stock: Int)
  // Coupon Events
  CouponCreated(
    coupon_id: Int,
    code: String,
    discount_type: DiscountType,
    discount_value: Int,
  )
  // Cart Events
  CartCreated(cart_id: Int, product_id: Int, quantity: Int)
  CartExpired(cart_id: Int)
  // Order Events
  OrderCreated(order_id: Int, cart_id: Int, product_id: Int, paid_amount: Int)
  OrderConfirmed(order_id: Int)
  OrderCancelled(order_id: Int)
  // Payment Events
  PaymentCompleted(
    payment_id: Int,
    order_id: Int,
    amount: Int,
    paid_at: DateTime,
  )
  PaymentFailed(payment_id: Int, order_id: Int, reason: String)
}

/// Event metadata
pub opaque type EventMetadata {
  EventMetadata(event_id: String, occurred_at: DateTime, event_type: String)
}

/// Domain event with metadata
pub opaque type DomainEventWithMetadata {
  DomainEventWithMetadata(event: DomainEvent, metadata: EventMetadata)
}

/// Create event metadata
pub fn create_metadata(event_type: String) -> EventMetadata {
  EventMetadata(
    event_id: generate_event_id(),
    occurred_at: common.now(),
    event_type: event_type,
  )
}

/// Wrap domain event with metadata
pub fn with_metadata(event: DomainEvent) -> DomainEventWithMetadata {
  let event_type = get_event_type(event)
  let metadata = create_metadata(event_type)
  DomainEventWithMetadata(event: event, metadata: metadata)
}

pub fn event_id(metadata: EventMetadata) -> String {
  let EventMetadata(event_id: event_id, ..) = metadata
  event_id
}

pub fn occurred_at(metadata: EventMetadata) -> DateTime {
  let EventMetadata(occurred_at: occurred_at, ..) = metadata
  occurred_at
}

pub fn event_type(metadata: EventMetadata) -> String {
  let EventMetadata(event_type: event_type, ..) = metadata
  event_type
}

pub fn event(envelope: DomainEventWithMetadata) -> DomainEvent {
  let DomainEventWithMetadata(event: event, ..) = envelope
  event
}

pub fn metadata(envelope: DomainEventWithMetadata) -> EventMetadata {
  let DomainEventWithMetadata(metadata: metadata, ..) = envelope
  metadata
}

/// Get event type name
pub fn get_event_type(event: DomainEvent) -> String {
  case event {
    ProductCreated(_, _, _, _) -> "ProductCreated"
    ProductStockUpdated(_, _) -> "ProductStockUpdated"
    CouponCreated(_, _, _, _) -> "CouponCreated"
    CartCreated(_, _, _) -> "CartCreated"
    CartExpired(_) -> "CartExpired"
    OrderCreated(_, _, _, _) -> "OrderCreated"
    OrderConfirmed(_) -> "OrderConfirmed"
    OrderCancelled(_) -> "OrderCancelled"
    PaymentCompleted(_, _, _, _) -> "PaymentCompleted"
    PaymentFailed(_, _, _) -> "PaymentFailed"
  }
}

// Generate a unique event ID (using FFI)
@external(javascript, "./domain_event_ffi.mjs", "generateEventId")
fn generate_event_id() -> String
