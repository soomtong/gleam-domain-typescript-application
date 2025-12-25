-- Products Table
CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price >= 0),
  stock INTEGER NOT NULL CHECK(stock >= 0),
  begin_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Active', 'Inactive', 'OutOfStock')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  coupon_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('Percentage', 'Fixed')),
  discount_value INTEGER NOT NULL CHECK(discount_value > 0),
  valid_from INTEGER NOT NULL,
  valid_until INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Active', 'Inactive', 'Expired')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Carts Table
CREATE TABLE IF NOT EXISTS carts (
  cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  coupon_id INTEGER,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  expired_at INTEGER NOT NULL,
  keep_until INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Active', 'Expired', 'CheckedOut')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  coupon_id INTEGER,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  paid_amount INTEGER NOT NULL CHECK(paid_amount >= 0),
  discount_amount INTEGER NOT NULL CHECK(discount_amount >= 0),
  status TEXT NOT NULL CHECK(status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (cart_id) REFERENCES carts(cart_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  paid_at INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK(amount >= 0),
  status TEXT NOT NULL CHECK(status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_carts_product_id ON carts(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
