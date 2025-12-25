import common
import gleeunit/should

pub fn parse_datetime_invalid_negative_test() {
  let result = common.parse_datetime(-1)
  let error = should.be_error(result)

  case error {
    common.InvalidTimestamp(_) -> Nil
  }
}

pub fn parse_datetime_invalid_zero_test() {
  let result = common.parse_datetime(0)
  let error = should.be_error(result)

  case error {
    common.InvalidTimestamp(_) -> Nil
  }
}

pub fn parse_datetime_valid_test() {
  let result = common.parse_datetime(1_735_257_600_000)
  should.be_ok(result)
}


