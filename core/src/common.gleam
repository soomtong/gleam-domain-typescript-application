// Common types and utilities for domain models

/// DateTime is represented as Unix timestamp in milliseconds (Int)
/// Compatible with JavaScript Date.now()
/// Example: 1735257600000 (2025-12-26T18:00:00.000Z)
pub type DateTime =
  Int

pub type DateTimeError {
  InvalidTimestamp(message: String)
}

/// Get current datetime as Unix timestamp (milliseconds)
pub fn now() -> DateTime {
  do_now()
}

/// Validate Unix timestamp
/// Returns Ok(DateTime) if valid (positive integer), Error otherwise
pub fn parse_datetime(timestamp: Int) -> Result(DateTime, DateTimeError) {
  case timestamp <= 0 {
    True ->
      Error(InvalidTimestamp("Timestamp must be a positive integer"))
    False -> Ok(timestamp)
  }
}

/// Compare two datetimes
/// Returns True if first is before second
pub fn is_before(first: DateTime, second: DateTime) -> Bool {
  first < second
}

/// Compare two datetimes
/// Returns True if first is after second
pub fn is_after(first: DateTime, second: DateTime) -> Bool {
  first > second
}

// FFI functions
@external(javascript, "./common_ffi.mjs", "now")
fn do_now() -> DateTime
