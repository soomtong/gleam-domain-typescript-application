# ========================================
# Cart Checkout Use Case Tests
# ========================================
#
# 이 테스트는 Cart → Order 체크아웃 플로우를 검증합니다:
# - Cart에서 Order로 변환
# - 재고 자동 감소
# - 쿠폰 할인 자동 적용
# - 트랜잭션 무결성
#
# 실행 방법:
#   hurl --test test-checkout-cart.hurl
# ========================================


# ========================================
# Setup: Create Test Data
# ========================================

# Setup 1: Create Product
POST http://localhost:3000/products
Content-Type: application/json
{
  "title": "Checkout Test Product",
  "price": 100000,
  "stock": 50,
  "begin_at": "2025-01-01T00:00:00Z",
  "end_at": "2025-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
[Captures]
test_product_id: jsonpath "$.data.product_id"
test_product_price: jsonpath "$.data.price"


# Setup 2: Create Coupon
POST http://localhost:3000/coupons
Content-Type: application/json
{
  "code": "CARTCHECKOUT20",
  "discount_type": "Percentage",
  "discount_value": 20,
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
[Captures]
test_coupon_id: jsonpath "$.data.coupon_id"


# ========================================
# Test 1: Checkout Cart without Coupon
# ========================================
# 목적: 쿠폰 없이 장바구니 체크아웃
# 입력: product_id, quantity
# 예상: Order 생성, 재고 감소, Cart CheckedOut
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 5,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Captures]
cart_id_1: jsonpath "$.data.cart_id"

POST http://localhost:3000/carts/{{cart_id_1}}/checkout

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.cart_id" == {{cart_id_1}}
jsonpath "$.data.product_id" == {{test_product_id}}
jsonpath "$.data.quantity" == 5
jsonpath "$.data.original_amount" == 500000
jsonpath "$.data.discount_amount" == 0
jsonpath "$.data.paid_amount" == 500000
jsonpath "$.data.order_status" == "Pending"
jsonpath "$.data.order_id" exists
[Captures]
order_id_1: jsonpath "$.data.order_id"


# Verify: Product stock decreased
GET http://localhost:3000/products/{{test_product_id}}

HTTP 200
[Asserts]
jsonpath "$.data.stock" == 45


# Verify: Cart status is CheckedOut
GET http://localhost:3000/carts/{{cart_id_1}}

HTTP 200
[Asserts]
jsonpath "$.data.status" == "CheckedOut"


# Verify: Order was created
GET http://localhost:3000/orders/{{order_id_1}}

HTTP 200
[Asserts]
jsonpath "$.data.cart_id" == {{cart_id_1}}
jsonpath "$.data.quantity" == 5
jsonpath "$.data.paid_amount" == 500000


# ========================================
# Test 2: Checkout Cart with Coupon
# ========================================
# 목적: 쿠폰 적용하여 장바구니 체크아웃
# 입력: product_id, quantity, coupon_id
# 예상: 할인 적용된 Order 생성
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 10,
  "coupon_id": {{test_coupon_id}},
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Captures]
cart_id_2: jsonpath "$.data.cart_id"

POST http://localhost:3000/carts/{{cart_id_2}}/checkout

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.quantity" == 10
jsonpath "$.data.original_amount" == 1000000
jsonpath "$.data.discount_amount" == 200000
jsonpath "$.data.paid_amount" == 800000
jsonpath "$.data.coupon_code" == "CARTCHECKOUT20"
[Captures]
order_id_2: jsonpath "$.data.order_id"


# Verify: Product stock decreased again
GET http://localhost:3000/products/{{test_product_id}}

HTTP 200
[Asserts]
jsonpath "$.data.stock" == 35


# Verify: Order has coupon discount
GET http://localhost:3000/orders/{{order_id_2}}

HTTP 200
[Asserts]
jsonpath "$.data.paid_amount" == 800000
jsonpath "$.data.discount_amount" == 200000
jsonpath "$.data.coupon_id" == {{test_coupon_id}}


# ========================================
# Test 3: Cannot Checkout Already Checked Out Cart
# ========================================
# 목적: 이미 체크아웃된 장바구니는 재체크아웃 불가
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/carts/{{cart_id_1}}/checkout

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "already checked out"


# ========================================
# Test 4: Cannot Checkout with Insufficient Stock
# ========================================
# 목적: 재고 부족 시 체크아웃 실패
# 예상: 400 Bad Request, 재고 변경 없음
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 40,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "Insufficient stock"


# Verify: Product stock unchanged
GET http://localhost:3000/products/{{test_product_id}}

HTTP 200
[Asserts]
jsonpath "$.data.stock" == 35


# ========================================
# Test 5: Cannot Modify Checked Out Cart
# ========================================
# 목적: 체크아웃된 장바구니는 수정 불가
# 예상: 400 Bad Request
# ========================================

PATCH http://localhost:3000/carts/{{cart_id_1}}/quantity
Content-Type: application/json
{
  "quantity": 10
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "checkedout"


# ========================================
# Test 6: Checkout Decreases Stock to Zero
# ========================================
# 목적: 재고를 0으로 만드는 체크아웃
# 예상: Product 상태 OutOfStock 전환
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 35,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Captures]
cart_id_4: jsonpath "$.data.cart_id"

POST http://localhost:3000/carts/{{cart_id_4}}/checkout

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.quantity" == 35


# Verify: Product is OutOfStock
GET http://localhost:3000/products/{{test_product_id}}

HTTP 200
[Asserts]
jsonpath "$.data.stock" == 0
jsonpath "$.data.status" == "OutOfStock"


# ========================================
# 테스트 완료!
# ========================================
# 총 6개 테스트 시나리오:
#   ✓ 쿠폰 없이 체크아웃
#   ✓ 쿠폰 적용 체크아웃 (20% 할인)
#   ✓ 재고 자동 감소
#   ✓ Cart 상태 CheckedOut 전환
#   ✓ 중복 체크아웃 방지
#   ✓ 재고 부족 시 실패
#   ✓ 체크아웃된 Cart 수정 방지
#   ✓ 재고 0 시 OutOfStock 전환
# ========================================
