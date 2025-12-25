# ========================================
# Order & Payment API Tests
# ========================================
#
# 이 테스트는 Order와 Payment API의 전체 기능을 검증합니다:
# - Order CRUD 및 상태 전환
# - Payment CRUD 및 상태 전환
# - Cart → Order → Payment 비즈니스 플로우
#
# 실행 방법:
#   hurl --test test-order-payment.hurl
# ========================================


# ========================================
# Setup: Create Test Data
# ========================================
# Order/Payment 테스트를 위해 먼저 Product, Coupon, Cart 생성
# ========================================

# Setup 1: Create Product
POST http://localhost:3000/products
Content-Type: application/json
{
  "title": "Test Product for Order",
  "price": 50000,
  "stock": 100,
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
  "code": "ORDERPAY10",
  "discount_type": "Percentage",
  "discount_value": 10,
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
[Captures]
test_coupon_id: jsonpath "$.data.coupon_id"


# Setup 3: Create Cart
POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 2,
  "coupon_id": {{test_coupon_id}},
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
[Captures]
test_cart_id: jsonpath "$.data.cart_id"


# ========================================
# Order Tests
# ========================================

# Test 1: Create Order
# ========================================
# 목적: Cart 기반으로 새 주문 생성
# 입력: cart_id, product_id, quantity, 금액 정보
# 예상: 201 Created, Pending 상태
# ========================================

POST http://localhost:3000/orders
Content-Type: application/json
{
  "cart_id": {{test_cart_id}},
  "product_id": {{test_product_id}},
  "coupon_id": {{test_coupon_id}},
  "quantity": 2,
  "paid_amount": 90000,
  "discount_amount": 10000
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.cart_id" == {{test_cart_id}}
jsonpath "$.data.product_id" == {{test_product_id}}
jsonpath "$.data.quantity" == 2
jsonpath "$.data.paid_amount" == 90000
jsonpath "$.data.discount_amount" == 10000
jsonpath "$.data.status" == "Pending"
[Captures]
order_id: jsonpath "$.data.order_id"


# Test 2: Get Order by ID
# ========================================
# 목적: 특정 주문 조회
# 예상: 200 OK, 생성한 주문 정보
# ========================================

GET http://localhost:3000/orders/{{order_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.status" == "Pending"


# Test 3: Get All Orders
# ========================================
# 목적: 모든 주문 조회
# 예상: 200 OK, 최소 1개 주문
# ========================================

GET http://localhost:3000/orders

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data" isCollection
jsonpath "$.data" count >= 1


# Test 4: Confirm Order
# ========================================
# 목적: 주문 확정 (Pending → Confirmed)
# 예상: 200 OK, Confirmed 상태
# ========================================

POST http://localhost:3000/orders/{{order_id}}/confirm

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.status" == "Confirmed"


# ========================================
# Payment Tests
# ========================================

# Test 5: Create Payment for Confirmed Order
# ========================================
# 목적: 확정된 주문에 대한 결제 생성
# 입력: order_id, amount
# 예상: 201 Created, Pending 상태
# ========================================

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{order_id}},
  "amount": 90000
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.amount" == 90000
jsonpath "$.data.status" == "Pending"
[Captures]
payment_id: jsonpath "$.data.payment_id"


# Test 6: Get Payment by ID
# ========================================
# 목적: 특정 결제 조회
# 예상: 200 OK, 생성한 결제 정보
# ========================================

GET http://localhost:3000/payments/{{payment_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.payment_id" == {{payment_id}}
jsonpath "$.data.status" == "Pending"


# Test 7: Get All Payments
# ========================================
# 목적: 모든 결제 조회
# 예상: 200 OK, 최소 1개 결제
# ========================================

GET http://localhost:3000/payments

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data" isCollection
jsonpath "$.data" count >= 1


# Test 8: Complete Payment
# ========================================
# 목적: 결제 완료 (Pending → Completed)
# 예상: 200 OK, Completed 상태
# 비즈니스 규칙: Payment Completed → Order도 Completed
# ========================================

POST http://localhost:3000/payments/{{payment_id}}/complete

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.payment_id" == {{payment_id}}
jsonpath "$.data.status" == "Completed"


# Test 9: Verify Order is Completed
# ========================================
# 목적: Payment 완료 후 Order 상태 확인
# 예상: Order 상태가 Completed로 변경됨
# ========================================

GET http://localhost:3000/orders/{{order_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.status" == "Completed"


# ========================================
# Payment Failure Flow
# ========================================

# Test 10: Create Another Order for Failure Test
# ========================================
# 목적: 결제 실패 시나리오 테스트를 위한 새 주문 생성
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 1,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Captures]
cart_id_2: jsonpath "$.data.cart_id"

POST http://localhost:3000/orders
Content-Type: application/json
{
  "cart_id": {{cart_id_2}},
  "product_id": {{test_product_id}},
  "quantity": 1,
  "paid_amount": 50000,
  "discount_amount": 0
}

HTTP 201
[Captures]
order_id_2: jsonpath "$.data.order_id"

POST http://localhost:3000/orders/{{order_id_2}}/confirm

HTTP 200

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{order_id_2}},
  "amount": 50000
}

HTTP 201
[Captures]
payment_id_2: jsonpath "$.data.payment_id"


# Test 11: Fail Payment
# ========================================
# 목적: 결제 실패 처리 (Pending → Failed)
# 예상: 200 OK, Failed 상태
# ========================================

POST http://localhost:3000/payments/{{payment_id_2}}/fail

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.payment_id" == {{payment_id_2}}
jsonpath "$.data.status" == "Failed"


# ========================================
# Payment Refund Flow
# ========================================

# Test 12: Create Another Order for Refund Test
# ========================================
# 목적: 환불 시나리오 테스트를 위한 새 주문 생성
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 1,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Captures]
cart_id_3: jsonpath "$.data.cart_id"

POST http://localhost:3000/orders
Content-Type: application/json
{
  "cart_id": {{cart_id_3}},
  "product_id": {{test_product_id}},
  "quantity": 1,
  "paid_amount": 50000,
  "discount_amount": 0
}

HTTP 201
[Captures]
order_id_3: jsonpath "$.data.order_id"

POST http://localhost:3000/orders/{{order_id_3}}/confirm

HTTP 200

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{order_id_3}},
  "amount": 50000
}

HTTP 201
[Captures]
payment_id_3: jsonpath "$.data.payment_id"

POST http://localhost:3000/payments/{{payment_id_3}}/complete

HTTP 200


# Test 13: Refund Payment
# ========================================
# 목적: 환불 처리 (Completed → Refunded)
# 예상: 200 OK, Refunded 상태
# ========================================

POST http://localhost:3000/payments/{{payment_id_3}}/refund

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.payment_id" == {{payment_id_3}}
jsonpath "$.data.status" == "Refunded"


# ========================================
# Validation Tests
# ========================================

# Test 14: Validation - Negative Paid Amount
# ========================================
# 목적: 유효성 검증
# 입력: paid_amount = -1000 (불가능)
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/orders
Content-Type: application/json
{
  "cart_id": {{test_cart_id}},
  "product_id": {{test_product_id}},
  "quantity": 1,
  "paid_amount": -1000,
  "discount_amount": 0
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" exists


# Test 15: Validation - Cannot Confirm Completed Order
# ========================================
# 목적: 완료된 주문은 확정 불가
# 예상: 400 Bad Request
# 참고: Test 8에서 Payment 완료 시 Order도 Completed로 변경됨
# ========================================

POST http://localhost:3000/orders/{{order_id}}/confirm

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "completed order"


# Test 16: Validation - Cannot Create Payment for Pending Order
# ========================================
# 목적: Pending 주문에는 결제 생성 불가
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 1,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Captures]
cart_id_4: jsonpath "$.data.cart_id"

POST http://localhost:3000/orders
Content-Type: application/json
{
  "cart_id": {{cart_id_4}},
  "product_id": {{test_product_id}},
  "quantity": 1,
  "paid_amount": 50000,
  "discount_amount": 0
}

HTTP 201
[Captures]
pending_order_id: jsonpath "$.data.order_id"

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{pending_order_id}},
  "amount": 50000
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "pending order"


# Test 17: Validation - Cannot Complete Failed Payment
# ========================================
# 목적: 실패한 결제는 완료 불가
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/payments/{{payment_id_2}}/complete

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "failed payment"


# Test 18: Validation - Cannot Refund Pending Payment
# ========================================
# 목적: Pending 결제는 환불 불가
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/orders/{{pending_order_id}}/confirm

HTTP 200

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{pending_order_id}},
  "amount": 50000
}

HTTP 201
[Captures]
pending_payment_id: jsonpath "$.data.payment_id"

POST http://localhost:3000/payments/{{pending_payment_id}}/refund

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "pending payment"


# ========================================
# 테스트 완료!
# ========================================
# 총 18개 테스트 시나리오:
# Order:
#   ✓ 주문 생성 (Pending 상태)
#   ✓ 주문 조회 (ID별, 전체)
#   ✓ 주문 확정 (Pending → Confirmed)
# Payment:
#   ✓ 결제 생성 (Confirmed Order에만 가능)
#   ✓ 결제 조회 (ID별, 전체)
#   ✓ 결제 완료 (Pending → Completed, Order도 Completed로)
#   ✓ 결제 실패 (Pending → Failed)
#   ✓ 환불 처리 (Completed → Refunded)
# Validation:
#   ✓ 음수 금액 검증
#   ✓ 중복 확정 방지
#   ✓ Pending 주문 결제 방지
#   ✓ 잘못된 상태 전환 방지
# ========================================
