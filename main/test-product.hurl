# ========================================
# Domain-Application Hybrid API Tests
# ========================================
#
# 이 테스트는 Product API의 전체 기능을 검증합니다:
# - Health check
# - CRUD 작업 (생성, 조회, 수정)
# - 비즈니스 로직 (재고 0 → OutOfStock)
# - 유효성 검증 (음수 가격, 존재하지 않는 리소스)
#
# 실행 방법:
#   bun run test:product           # 기본 테스트
#   bun run test:product:verbose   # 상세 출력
# ========================================


# ========================================
# Test 1: Health Check
# ========================================
# 목적: 서버가 정상적으로 실행 중인지 확인
# 예상: 200 OK, 서버 정보 반환
# ========================================

GET http://localhost:3000/

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.message" == "Domain-Application Hybrid API Server"
jsonpath "$.version" == "1.0.0"


# ========================================
# Test 2: Create Product
# ========================================
# 목적: 새로운 상품 생성
# 입력: 제목, 가격, 재고, 판매 기간
# 예상: 201 Created, product_id 자동 생성
# 비즈니스 규칙: 재고 > 0 → Active 상태
# ========================================

POST http://localhost:3000/products
Content-Type: application/json
{
  "title": "TypeScript 완벽 가이드",
  "price": 38000,
  "stock": 50,
  "begin_at": "2025-01-01T00:00:00Z",
  "end_at": "2025-12-31T23:59:59Z"
}

HTTP 201
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.title" == "TypeScript 완벽 가이드"
jsonpath "$.data.price" == 38000
jsonpath "$.data.stock" == 50
jsonpath "$.data.status" == "Active"
jsonpath "$.data.product_id" exists
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists

[Captures]
product_id: jsonpath "$.data.product_id"


# ========================================
# Test 3: Get All Products
# ========================================
# 목적: 모든 상품 목록 조회
# 예상: 200 OK, 배열 형태의 상품 리스트
# 검증: 최소 1개 이상의 상품 존재
# ========================================

GET http://localhost:3000/products

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data" isCollection
jsonpath "$.data" count >= 1


# ========================================
# Test 4: Get Product by ID
# ========================================
# 목적: 특정 상품 ID로 상세 조회
# 입력: Test 2에서 생성한 product_id 사용
# 예상: 200 OK, 생성한 상품의 상세 정보
# ========================================

GET http://localhost:3000/products/{{product_id}}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.product_id" == {{product_id}}
jsonpath "$.data.title" == "TypeScript 완벽 가이드"
jsonpath "$.data.price" == 38000
jsonpath "$.data.stock" == 50


# ========================================
# Test 5: Update Product Stock
# ========================================
# 목적: 상품 재고 업데이트
# 입력: stock = 25 (50 → 25로 감소)
# 예상: 200 OK, 재고 변경 및 updated_at 갱신
# 비즈니스 규칙: 재고 > 0 → Active 상태 유지
# ========================================

PATCH http://localhost:3000/products/{{product_id}}/stock
Content-Type: application/json
{
  "stock": 25
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.stock" == 25
jsonpath "$.data.status" == "Active"
jsonpath "$.data.updated_at" exists


# ========================================
# Test 6: Update Stock to 0 (OutOfStock)
# ========================================
# 목적: 재고 소진 시나리오 테스트
# 입력: stock = 0
# 예상: 200 OK
# 비즈니스 규칙: 재고 = 0 → OutOfStock 상태로 자동 전환
# ========================================

PATCH http://localhost:3000/products/{{product_id}}/stock
Content-Type: application/json
{
  "stock": 0
}

HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.stock" == 0
jsonpath "$.data.status" == "OutOfStock"


# ========================================
# Test 7: Validation - Negative Price
# ========================================
# 목적: 유효성 검증 테스트
# 입력: 음수 가격 (-1000)
# 예상: 400 Bad Request, 에러 메시지
# 검증: 비즈니스 규칙 위반 시 요청 거부
# ========================================

POST http://localhost:3000/products
Content-Type: application/json
{
  "title": "Invalid Product",
  "price": -1000,
  "stock": 10,
  "begin_at": "2025-01-01T00:00:00Z",
  "end_at": "2025-12-31T23:59:59Z"
}

HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" exists
jsonpath "$.error" contains "price"


# ========================================
# Test 8: Not Found - Non-existent Product
# ========================================
# 목적: 존재하지 않는 리소스 조회 시 처리
# 입력: 존재하지 않는 product_id (99999)
# 예상: 404 Not Found, 적절한 에러 메시지
# ========================================

GET http://localhost:3000/products/99999

HTTP 404
[Asserts]
jsonpath "$.success" == false
jsonpath "$.error" == "Product not found"


# ========================================
# 테스트 완료!
# ========================================
# 총 8개 테스트 시나리오:
# ✓ Health check
# ✓ Product 생성 (재고 > 0)
# ✓ 전체 상품 조회
# ✓ 특정 상품 조회
# ✓ 재고 업데이트 (일반)
# ✓ 재고 업데이트 (0 → OutOfStock)
# ✓ 유효성 검증 실패 (음수 가격)
# ✓ 존재하지 않는 리소스 조회
# ========================================
