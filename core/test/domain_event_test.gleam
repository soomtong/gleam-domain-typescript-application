import coupon
import domain_event
import gleeunit/should

pub fn with_metadata_sets_event_type_test() {
  let event =
    domain_event.CouponCreated(
      coupon_id: 1,
      code: "C1",
      discount_type: coupon.Fixed(10),
      discount_value: 10,
    )

  let envelope = domain_event.with_metadata(event)
  let metadata = domain_event.metadata(envelope)

  should.equal(domain_event.event_type(metadata), "CouponCreated")
}
