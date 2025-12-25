# ========================================
# E2E API Scenario Tests (One-shot Flow)
# ========================================
#
# 목표:
# - 우리 프로그램의 실제 실행 흐름(Product → Coupon → Cart → Checkout → Order → Payment)을
#   "한 방" 시나리오로 생성/사용하면서 검증합니다.
# - DB reset 없이 반복 실행 가능하도록, UNIQUE 충돌이 있는 쿠폰 코드는 매 실행마다
#   `{{newUuid}}`로 고유하게 생성합니다.
#
# 실행 전 조건:
# - 서버가 실행 중이어야 합니다 (기본: http://localhost:3000)
# - DB 마이그레이션은 최소 1회 수행되어 있어야 합니다.
#
# 실행 방법:
#   bun run test:e2e           # 기본 테스트
#   bun run test:e2e:verbose   # 상세 출력
#
# ========================================


# ========================================
# Step 0: Health Check
# ========================================
# 목적: 서버가 정상 실행 중인지 확인
# 예상: 200 OK, 기본 정보 및 endpoints 포함
# ========================================

GET http://localhost:3000/

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.version" == "1.0.0"
jsonpath "$.endpoints.products" == "/products"
jsonpath "$.endpoints.coupons" == "/coupons"
jsonpath "$.endpoints.carts" == "/carts"
jsonpath "$.endpoints.orders" == "/orders"
jsonpath "$.endpoints.payments" == "/payments"


# ========================================
# Step 1: Create Coupon (unique per run)
# ========================================
# 목적:
# - Checkout 시나리오에서 할인 적용을 검증하기 위한 쿠폰을 준비합니다.
# - coupons.code는 UNIQUE이므로, 매 실행마다 고유 코드로 생성합니다.
#
# 설계 포인트:
# - 유효기간은 넉넉하게(2000~2099) 설정하여 실행 날짜에 덜 민감하게 만듭니다.
# - 할인 타입은 Percentage(10%)로 고정하여 이후 금액 계산을 정확히 assert합니다.
# ========================================

POST http://localhost:3000/coupons
Content-Type: application/json
{
  "code": "E2E-{{newUuid}}",
  "discount_type": "Percentage",
  "discount_value": 10,
  "valid_from": "2000-01-01T00:00:00Z",
  "valid_until": "2099-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.coupon_id" exists
jsonpath "$.data.discount_type" == "Percentage"
jsonpath "$.data.discount_value" == 10
jsonpath "$.data.status" == "Active"
[Captures]
coupon_id: jsonpath "$.data.coupon_id"
coupon_code: jsonpath "$.data.code"


# ========================================
# Step 2: Create Product (stock for checkout)
# ========================================
# 목적:
# - Cart/Checkout에 사용할 상품을 생성합니다.
#
# 설계 포인트:
# - price=50,000 / quantity=2 이므로 original_amount=100,000
# - stock=10으로 시작하면 체크아웃 후 stock=8이 되어야 합니다.
# ========================================

POST http://localhost:3000/products
Content-Type: application/json
{
  "title": "E2E Checkout Product",
  "price": 50000,
  "stock": 10,
  "begin_at": "2000-01-01T00:00:00Z",
  "end_at": "2099-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.product_id" exists
jsonpath "$.data.price" == 50000
jsonpath "$.data.stock" == 10
jsonpath "$.data.status" == "Active"
[Captures]
product_id: jsonpath "$.data.product_id"


# ========================================
# Step 3: Create Cart (with coupon)
# ========================================
# 목적:
# - 생성한 Product + Coupon을 사용해 Cart를 생성합니다.
#
# 설계 포인트:
# - expired_at/keep_until은 먼 미래로 두어, Cart가 Expired로 처리될 가능성을 제거합니다.
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{product_id}},
  "coupon_id": {{coupon_id}},
  "quantity": 2,
  "expired_at": "2099-12-31T00:00:00Z",
  "keep_until": "2099-12-31T00:00:00Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.cart_id" exists
jsonpath "$.data.product_id" == {{product_id}}
jsonpath "$.data.coupon_id" == {{coupon_id}}
jsonpath "$.data.quantity" == 2
jsonpath "$.data.status" == "Active"
[Captures]
cart_id: jsonpath "$.data.cart_id"


# ========================================
# Step 4: Checkout Cart (creates Order, decreases stock)
# ========================================
# 목적:
# - Cart를 체크아웃하여 Order를 생성합니다.
# - 동시에 Product 재고 감소 및 Cart 상태 전환(CheckedOut)을 검증합니다.
#
# 금액 규칙(코드 기준):
# - original_amount = product.price * cart.quantity = 50,000 * 2 = 100,000
# - discount_amount = floor(original_amount * 10%) = 10,000
# - paid_amount = original_amount - discount_amount = 90,000
# ========================================

POST http://localhost:3000/carts/{{cart_id}}/checkout

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" exists
jsonpath "$.data.cart_id" == {{cart_id}}
jsonpath "$.data.product_id" == {{product_id}}
jsonpath "$.data.quantity" == 2
jsonpath "$.data.original_amount" == 100000
jsonpath "$.data.discount_amount" == 10000
jsonpath "$.data.paid_amount" == 90000
jsonpath "$.data.coupon_code" == {{coupon_code}}
jsonpath "$.data.order_status" == "Pending"
[Captures]
order_id: jsonpath "$.data.order_id"
paid_amount: jsonpath "$.data.paid_amount"


# ----------------------------------------
# Step 4-1: Verify Product stock decreased
# ----------------------------------------
# 목적: 체크아웃 후 재고가 정확히 감소했는지 확인
# 예상: stock = 8
# ----------------------------------------

GET http://localhost:3000/products/{{product_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.stock" == 8
jsonpath "$.data.status" == "Active"


# ----------------------------------------
# Step 4-2: Verify Cart is CheckedOut
# ----------------------------------------
# 목적: 체크아웃 후 Cart 상태 전환 확인
# 예상: status = CheckedOut
# ----------------------------------------

GET http://localhost:3000/carts/{{cart_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.status" == "CheckedOut"


# ----------------------------------------
# Step 4-3: Double checkout should fail
# ----------------------------------------
# 목적: 이미 체크아웃된 Cart는 재체크아웃이 불가능해야 함
# 예상: 400 Bad Request
# ----------------------------------------

POST http://localhost:3000/carts/{{cart_id}}/checkout

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "already checked out"


# ========================================
# Step 5: Confirm Order (Pending → Confirmed)
# ========================================
# 목적:
# - Payment 생성은 Confirmed 주문만 허용되므로(Order 상태 전환 규칙),
#   먼저 주문을 확정합니다.
# ========================================

POST http://localhost:3000/orders/{{order_id}}/confirm

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.status" == "Confirmed"


# ========================================
# Step 6: Create Payment (for confirmed order)
# ========================================
# 목적:
# - 확정된 주문에 대해 결제를 생성합니다.
# - amount는 Checkout 결과 paid_amount(=90,000)과 일치해야 합니다.
# ========================================

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{order_id}},
  "amount": {{paid_amount}}
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.payment_id" exists
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.amount" == 90000
jsonpath "$.data.status" == "Pending"
[Captures]
payment_id: jsonpath "$.data.payment_id"


# ----------------------------------------
# Step 6-1: Duplicate payment should fail
# ----------------------------------------
# 목적: 한 주문에 결제는 1건만 생성되어야 함
# 예상: 400 Bad Request
# ----------------------------------------

POST http://localhost:3000/payments
Content-Type: application/json
{
  "order_id": {{order_id}},
  "amount": {{paid_amount}}
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "already exists"


# ========================================
# Step 7: Complete Payment (Pending → Completed)
# ========================================
# 목적:
# - 결제를 완료 처리합니다.
# - 구현상 결제 완료 시 Order도 Completed로 업데이트를 시도합니다.
# ========================================

POST http://localhost:3000/payments/{{payment_id}}/complete

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.payment_id" == {{payment_id}}
jsonpath "$.data.status" == "Completed"


# ========================================
# Step 8: Verify Order is Completed
# ========================================
# 목적: Payment 완료 후 Order 상태가 Completed로 바뀌었는지 확인
# 예상: status = Completed
# ========================================

GET http://localhost:3000/orders/{{order_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.order_id" == {{order_id}}
jsonpath "$.data.status" == "Completed"


