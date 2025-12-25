# ========================================
# Coupon & Cart API Tests
# ========================================
#
# 이 테스트는 Coupon과 Cart API의 전체 기능을 검증합니다:
# - Coupon CRUD 및 할인 계산
# - Cart CRUD 및 쿠폰 적용
# - 비즈니스 로직 검증
#
# 실행 방법:
#   hurl --test test-coupon-cart.hurl
# ========================================


# ========================================
# Setup: Create Test Product
# ========================================
# Cart 테스트를 위해 먼저 Product 생성
# ========================================

POST http://localhost:3000/products
Content-Type: application/json
{
  "title": "Test Product for Cart",
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


# ========================================
# Coupon Tests
# ========================================

# Test 1: Create Percentage Coupon
# ========================================
# 목적: 퍼센트 할인 쿠폰 생성
# 입력: 10% 할인 쿠폰
# 예상: 201 Created, Active 상태
# ========================================

POST http://localhost:3000/coupons
Content-Type: application/json
{
  "code": "NEWYEAR10",
  "discount_type": "Percentage",
  "discount_value": 10,
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.code" == "NEWYEAR10"
jsonpath "$.data.discount_type" == "Percentage"
jsonpath "$.data.discount_value" == 10
jsonpath "$.data.status" == "Active"
[Captures]
coupon_id: jsonpath "$.data.coupon_id"
coupon_code: jsonpath "$.data.code"


# Test 2: Create Fixed Discount Coupon
# ========================================
# 목적: 고정 금액 할인 쿠폰 생성
# 입력: 5000원 할인 쿠폰
# 예상: 201 Created
# ========================================

POST http://localhost:3000/coupons
Content-Type: application/json
{
  "code": "HOLIDAY5000",
  "discount_type": "Fixed",
  "discount_value": 5000,
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.code" == "HOLIDAY5000"
jsonpath "$.data.discount_type" == "Fixed"
jsonpath "$.data.discount_value" == 5000


# Test 3: Get All Coupons
# ========================================
# 목적: 모든 쿠폰 목록 조회
# 예상: 200 OK, 최소 2개 쿠폰
# ========================================

GET http://localhost:3000/coupons

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data" isCollection
jsonpath "$.data" count >= 2


# Test 4: Get Coupon by Code
# ========================================
# 목적: 쿠폰 코드로 조회
# 예상: 200 OK, WELCOME10 쿠폰 정보
# ========================================

GET http://localhost:3000/coupons/{{coupon_code}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.code" == "NEWYEAR10"
jsonpath "$.data.discount_value" == 10


# Test 5: Calculate Percentage Discount
# ========================================
# 목적: 퍼센트 할인 계산
# 입력: 원가 50000원, 10% 할인
# 예상: 할인액 5000원, 최종가 45000원
# ========================================

POST http://localhost:3000/coupons/NEWYEAR10/calculate
Content-Type: application/json
{
  "original_price": 50000
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.original_price" == 50000
jsonpath "$.data.discount_amount" == 5000
jsonpath "$.data.final_price" == 45000
jsonpath "$.data.coupon_code" == "NEWYEAR10"


# Test 6: Calculate Fixed Discount
# ========================================
# 목적: 고정 금액 할인 계산
# 입력: 원가 50000원, 5000원 할인
# 예상: 할인액 5000원, 최종가 45000원
# ========================================

POST http://localhost:3000/coupons/HOLIDAY5000/calculate
Content-Type: application/json
{
  "original_price": 50000
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.discount_amount" == 5000
jsonpath "$.data.final_price" == 45000


# Test 7: Validation - Invalid Percentage (> 100)
# ========================================
# 목적: 유효성 검증
# 입력: 150% 할인 (불가능)
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/coupons
Content-Type: application/json
{
  "code": "INVALID150",
  "discount_type": "Percentage",
  "discount_value": 150,
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "100"


# Test 8: Validation - Duplicate Code
# ========================================
# 목적: 중복 코드 검증
# 입력: 이미 존재하는 WELCOME10
# 예상: 400 Bad Request
# ========================================

POST http://localhost:3000/coupons
Content-Type: application/json
{
  "code": "NEWYEAR10",
  "discount_type": "Percentage",
  "discount_value": 20,
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "already exists"


# ========================================
# Cart Tests
# ========================================

# Test 9: Create Cart without Coupon
# ========================================
# 목적: 기본 장바구니 생성
# 입력: product_id=1, quantity=2
# 예상: 201 Created, Active 상태
# ========================================

POST http://localhost:3000/carts
Content-Type: application/json
{
  "product_id": {{test_product_id}},
  "quantity": 2,
  "expired_at": "2025-12-26T00:00:00Z",
  "keep_until": "2025-12-27T00:00:00Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.product_id" == {{test_product_id}}
jsonpath "$.data.quantity" == 2
jsonpath "$.data.coupon_id" == null
jsonpath "$.data.status" == "Active"
[Captures]
cart_id: jsonpath "$.data.cart_id"


# Test 10: Get Cart by ID
# ========================================
# 목적: 특정 장바구니 조회
# 예상: 200 OK, 생성한 장바구니 정보
# ========================================

GET http://localhost:3000/carts/{{cart_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.cart_id" == {{cart_id}}
jsonpath "$.data.product_id" == {{test_product_id}}


# Test 11: Add Coupon to Cart
# ========================================
# 목적: 장바구니에 쿠폰 추가
# 입력: coupon_id (WELCOME10)
# 예상: 200 OK, coupon_id 업데이트
# ========================================

PATCH http://localhost:3000/carts/{{cart_id}}/coupon
Content-Type: application/json
{
  "coupon_id": {{coupon_id}}
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.coupon_id" == {{coupon_id}}


# Test 12: Update Cart Quantity
# ========================================
# 목적: 장바구니 수량 변경
# 입력: quantity = 5
# 예상: 200 OK, 수량 업데이트
# ========================================

PATCH http://localhost:3000/carts/{{cart_id}}/quantity
Content-Type: application/json
{
  "quantity": 5
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.quantity" == 5


# Test 13: Remove Coupon from Cart
# ========================================
# 목적: 장바구니에서 쿠폰 제거
# 입력: coupon_id = null
# 예상: 200 OK, coupon_id = null
# ========================================

PATCH http://localhost:3000/carts/{{cart_id}}/coupon
Content-Type: application/json
{
  "coupon_id": null
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.coupon_id" == null


# Test 14: Get All Carts
# ========================================
# 목적: 모든 장바구니 조회
# 예상: 200 OK, 최소 1개 장바구니
# ========================================

GET http://localhost:3000/carts

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data" isCollection
jsonpath "$.data" count >= 1


# Test 15: Get Active Carts
# ========================================
# 목적: 활성 장바구니만 조회
# 예상: 200 OK, Active 상태 장바구니들
# ========================================

GET http://localhost:3000/carts/active

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data" isCollection


# Test 16: Validation - Invalid Quantity
# ========================================
# 목적: 유효성 검증
# 입력: quantity = 0 (불가능)
# 예상: 400 Bad Request
# ========================================

PATCH http://localhost:3000/carts/{{cart_id}}/quantity
Content-Type: application/json
{
  "quantity": 0
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" exists


# Test 17: Validation - Insufficient Stock
# ========================================
# 목적: 재고 부족 검증
# 입력: quantity = 999999 (재고 초과)
# 예상: 400 Bad Request
# ========================================

PATCH http://localhost:3000/carts/{{cart_id}}/quantity
Content-Type: application/json
{
  "quantity": 999999
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" contains "Insufficient stock"


# ========================================
# 테스트 완료!
# ========================================
# 총 17개 테스트 시나리오:
# Coupon:
#   ✓ 퍼센트 할인 쿠폰 생성
#   ✓ 고정 금액 할인 쿠폰 생성
#   ✓ 쿠폰 조회 (전체, 코드별)
#   ✓ 할인 계산 (퍼센트, 고정)
#   ✓ 유효성 검증 (150% 초과, 중복 코드)
# Cart:
#   ✓ 장바구니 생성
#   ✓ 장바구니 조회 (ID별, 전체, 활성)
#   ✓ 쿠폰 추가/제거
#   ✓ 수량 변경
#   ✓ 유효성 검증 (0 수량, 재고 부족)
# ========================================
