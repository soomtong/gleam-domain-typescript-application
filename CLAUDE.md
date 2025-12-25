# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

실험적 하이브리드 아키텍처 프로젝트로, Clean Architecture 원칙을 기반으로 합니다.
- **Domain Layer**: Gleam으로 구현 (타입 안정성, Sum Type 활용)
- **Application/Infrastructure Layer**: TypeScript + Bun + Hono로 구현

## Directory Structure

```
domain-application-hybrid/
├── core/                    # Domain Layer (Gleam)
│   ├── src/
│   │   ├── common.gleam     # DateTime 타입, 공통 유틸리티
│   │   ├── product.gleam    # Product Aggregate
│   │   ├── coupon.gleam     # Coupon Aggregate
│   │   ├── cart.gleam       # Cart Aggregate
│   │   ├── order.gleam      # Order Aggregate
│   │   ├── payment.gleam    # Payment Aggregate
│   │   └── domain_event.gleam  # Domain Events
│   ├── test/                # Gleam unit tests
│   └── build/               # Gleam 컴파일 출력 (JavaScript)
│
└── main/                    # Application/Infrastructure (TypeScript + Bun)
    ├── src/
    │   ├── index.ts         # Hono 서버 엔트리포인트
    │   ├── config/          # 설정 (DB 연결)
    │   ├── db/              # 데이터베이스 (스키마, Repository, 마이그레이션)
    │   ├── api/             # API Routes, DTO
    │   ├── domain/          # Gleam 도메인 모델 래퍼
    │   ├── use-cases/       # 복잡한 비즈니스 플로우 (Checkout 등)
    │   └── types/           # TypeScript 타입 정의
    ├── data/                # SQLite 데이터베이스
    └── test-*.hurl          # API E2E 테스트 (hurl)
```

## Development Commands

### 초기 설정
```bash
# 1. Gleam 도메인 레이어 빌드
cd core
gleam build

# 2. TypeScript 의존성 설치
cd ../main
bun install

# 3. 데이터베이스 마이그레이션
bun run db:migrate

# 4. 개발 서버 실행
bun dev
```

### Gleam (core/)
```bash
cd core
bun run build        # Gleam 컴파일 (package.json script)
gleam build          # Gleam 컴파일 (직접 실행)
gleam test           # 유닛 테스트 실행
gleam format         # 코드 포맷팅
```

### TypeScript/Bun (main/)
```bash
cd main
bun install          # 의존성 설치
bun dev              # 개발 서버 실행 (Gleam 자동 빌드 포함)
bun build            # 프로덕션 빌드 (Gleam + TypeScript)
bun run db:migrate   # 데이터베이스 마이그레이션

# API E2E 테스트 (hurl)
bun run test:product           # Product API 테스트
bun run test:coupon-cart       # Coupon & Cart API 테스트
bun run test:order-payment     # Order & Payment API 테스트
bun run test:checkout          # Cart Checkout Use Case 테스트
bun run test:product:verbose   # 상세 출력
```

### 데이터베이스 초기화
```bash
cd main
rm data/app.db*          # 데이터베이스 삭제
bun run db:migrate       # 새로 마이그레이션
```

## Domain Model

### Domain Flows
1. `coupon → order → payment`
2. `product → cart → order`

### Aggregates

#### Product Aggregate
```gleam
pub type ProductStatus {
  Active
  Inactive
  OutOfStock
}

pub type Product {
  Product(
    product_id: Int,           // 자동 증가
    title: String,
    price: Int,
    stock: Int,
    begin_at: DateTime,        // Unix timestamp (밀리초)
    end_at: DateTime,          // Unix timestamp (밀리초)
    status: ProductStatus,
    created_at: DateTime,      // Unix timestamp (밀리초)
    updated_at: DateTime,      // Unix timestamp (밀리초)
  )
}
```

#### Coupon Aggregate
```gleam
pub type DiscountType {
  Percentage(Int)
  Fixed(Int)
}

pub type CouponStatus {
  Active
  Inactive
  Expired
}

pub type Coupon {
  Coupon(
    coupon_id: Int,            // 자동 증가
    code: String,
    discount_type: DiscountType,
    discount_value: Int,
    valid_from: DateTime,      // Unix timestamp (밀리초)
    valid_until: DateTime,     // Unix timestamp (밀리초)
    status: CouponStatus,
    created_at: DateTime,      // Unix timestamp (밀리초)
    updated_at: DateTime,      // Unix timestamp (밀리초)
  )
}
```

#### Cart Aggregate
```gleam
pub type CartStatus {
  Active
  Expired
  CheckedOut
}

pub type Cart {
  Cart(
    cart_id: Int,              // 자동 증가
    product_id: Int,
    coupon_id: Option(Int),
    quantity: Int,
    expired_at: DateTime,      // Unix timestamp (밀리초)
    keep_until: DateTime,      // Unix timestamp (밀리초)
    status: CartStatus,
    created_at: DateTime,      // Unix timestamp (밀리초)
    updated_at: DateTime,      // Unix timestamp (밀리초)
  )
}
```

#### Order Aggregate
```gleam
pub type OrderStatus {
  Pending
  Confirmed
  Cancelled
  Completed
}

pub type Order {
  Order(
    order_id: Int,             // 자동 증가
    cart_id: Int,
    product_id: Int,
    coupon_id: Option(Int),
    quantity: Int,
    paid_amount: Int,
    discount_amount: Int,
    status: OrderStatus,
    created_at: DateTime,      // Unix timestamp (밀리초)
    updated_at: DateTime,      // Unix timestamp (밀리초)
  )
}
```

#### Payment Aggregate
```gleam
pub type PaymentStatus {
  Pending
  Completed
  Failed
  Refunded
}

pub type Payment {
  Payment(
    payment_id: Int,           // 자동 증가
    order_id: Int,
    paid_at: DateTime,         // Unix timestamp (밀리초)
    amount: Int,
    status: PaymentStatus,
    created_at: DateTime,      // Unix timestamp (밀리초)
    updated_at: DateTime,      // Unix timestamp (밀리초)
  )
}
```

### Domain Events

```gleam
pub type DomainEvent {
  // Product Events
  ProductCreated(product_id: Int, title: String, price: Int, stock: Int)
  ProductStockUpdated(product_id: Int, stock: Int)

  // Coupon Events
  CouponCreated(coupon_id: Int, code: String, discount_type: DiscountType, discount_value: Int)

  // Cart Events
  CartCreated(cart_id: Int, product_id: Int, quantity: Int)
  CartExpired(cart_id: Int)

  // Order Events
  OrderCreated(order_id: Int, cart_id: Int, product_id: Int, paid_amount: Int)
  OrderConfirmed(order_id: Int)
  OrderCancelled(order_id: Int)

  // Payment Events
  PaymentCompleted(payment_id: Int, order_id: Int, amount: Int, paid_at: DateTime)
  PaymentFailed(payment_id: Int, order_id: Int, reason: String)
}
```

## Architecture Decisions

### Why Gleam for Domain Layer?
- **타입 안정성**: 컴파일 타임에 대부분의 오류 검출
- **Sum Types**: 도메인 상태를 명확하게 표현 (OrderStatus, PaymentStatus 등)
- **불변성**: 함수형 프로그래밍으로 부작용 최소화
- **패턴 매칭**: 비즈니스 로직을 명확하게 표현

### Why TypeScript + Bun for Application Layer?
- **Bun**: 빠른 런타임 및 패키지 관리
- **Hono**: 경량 웹 프레임워크
- **TypeScript**: Gleam과의 타입 호환성

### Database: SQLite
- 간단한 구현을 위한 경량 데이터베이스
- 파일 기반으로 배포 및 테스트 용이

### ID Strategy
- 모든 Aggregate는 자동 증가 정수(Int)를 ID로 사용
- SQLite의 `AUTOINCREMENT` 활용

## Key Patterns

### Clean Architecture Layers
1. **Domain (core/)**: 비즈니스 로직, Aggregate, Events - Gleam
2. **Application (main/src/api/)**: Use Cases, API Routes - TypeScript
3. **Infrastructure (main/src/db/)**: Database, Repository - TypeScript

### Gleam ↔ TypeScript 통신
- Gleam 코드는 JavaScript로 컴파일되어 Bun 런타임 위에서 실행됨
- **중요**: Gleam 자체 런타임을 사용하지 않고, TypeScript/Bun 서버 환경에서 동작
- `core/package.json`의 `exports` 필드를 통해 TypeScript에서 Gleam 모듈 import
- Gleam의 안전한 타입 시스템을 레버리지하기 위한 검증 프로젝트

### DateTime 처리
- **Gleam**: Unix timestamp (밀리초, Int 타입) - `pub type DateTime = Int`
- **TypeScript**: number 타입 - `export type DateTime = number`
- **SQLite**: INTEGER 타입으로 저장
- **JavaScript 호환**: `Date.now()` 반환값과 직접 호환
- **예시**: `1735257600000` (2025-12-26T18:00:00.000Z)

### 비즈니스 규칙
- 재고가 0이 되면 자동으로 `ProductStatus.OutOfStock`으로 전환
- 쿠폰은 유효 기간 내에서만 사용 가능
- 장바구니는 만료 시간(`expired_at`) 이후 `CartStatus.Expired`로 전환
- 주문 상태 전환: `Pending → Confirmed → Completed` 또는 `Pending → Cancelled`
- 결제는 `Confirmed` 상태의 주문에만 생성 가능
- 결제 완료 시 주문도 자동으로 `Completed` 상태로 전환
- Cart Checkout 시 자동으로 Order 생성 및 재고 감소 (트랜잭션 처리)

## Testing Strategy

### Gleam Unit Tests (core/test/)
- Gleam 도메인 로직의 단위 테스트
- 실행: `cd core && gleam test`
- Aggregate의 비즈니스 규칙과 상태 전환 검증

### TypeScript Unit Tests (main/src/)
- Use Case와 Repository 로직 테스트
- 실행: `cd main && bun test`
- 파일 패턴: `*.test.ts`

### API E2E Tests (main/test-*.hurl)
- HTTP API 엔드포인트 통합 테스트
- 실행: `cd main && bun run test:product` (또는 다른 테스트 스크립트)
- 테스트 파일:
  - `test-product.hurl` - Product API
  - `test-coupon-cart.hurl` - Coupon & Cart API
  - `test-order-payment.hurl` - Order & Payment API
  - `test-checkout-cart.hurl` - Cart Checkout Use Case
  - `test-e2e.hurl` - 전체 E2E 플로우

## Development Workflow

### 1. 새로운 Aggregate 추가
```bash
# 1. Gleam 도메인 모델 생성
cd core/src
# product.gleam, coupon.gleam 참고하여 새 Aggregate 작성

# 2. Gleam 빌드 및 테스트
cd ..
gleam test
gleam build

# 3. TypeScript Repository 생성
cd ../main/src/db/repositories
# product.repository.ts 참고하여 새 Repository 작성

# 4. Use Case 작성
cd ../../use-cases
# 기존 use-case 파일 참고

# 5. API Routes 추가
cd ../api/routes
# product.routes.ts 참고하여 라우트 작성
```

### 2. Gleam 도메인 모델 수정 시
```bash
# 1. Gleam 코드 수정 후 빌드
cd core
gleam format  # 포맷팅
gleam test    # 테스트
gleam build   # JavaScript 컴파일

# 2. TypeScript 타입이 자동으로 업데이트됨
# core/build/dev/javascript/domain_core/*.d.mts 파일 확인

# 3. 서버 재시작
cd ../main
bun dev
```

### 3. 데이터베이스 스키마 변경
```bash
cd main/src/db
# schema.sql 수정 후

cd ../..
rm data/app.db*          # 데이터베이스 삭제
bun run db:migrate       # 새로 마이그레이션
bun dev                  # 서버 재시작
```

## Important Implementation Notes

### Gleam Opaque Types
- Gleam의 `opaque type`은 캡슐화를 강제함
- Aggregate의 내부 상태는 getter 함수로만 접근 가능
- 예: `productDomain.product_id(product)`, `productDomain.title(product)`

### Result 타입 처리
- Gleam은 `Result(T, E)` 타입 사용 (TypeScript와 다름)
- TypeScript에서 `unwrapResult()` 헬퍼로 변환 (src/domain/core-domain.ts 참고)
- 에러 발생 시 `DomainError` 예외로 변환됨

### Repository 패턴
- Repository는 도메인 모델을 반환하고 받음 (DTO가 아닌 Gleam Aggregate)
- `mapToProduct()`, `mapToCoupon()` 등의 메서드로 DB 행을 도메인 모델로 재구성
- `reconstitute()` 함수를 사용하여 유효성 검증 포함

### Transaction 처리
- SQLite 트랜잭션은 `db.transaction(() => { ... })` 사용
- 예: `checkout-cart.use-case.ts` 참고
- 트랜잭션 내에서 에러 발생 시 자동 롤백

### FFI (Foreign Function Interface)
- Gleam과 JavaScript 연동을 위한 FFI 파일
- 예: `core/src/common_ffi.mjs` - `Date.now()` 호출
- 예: `core/src/domain_event_ffi.mjs` - UUID 생성
- FFI 파일은 순수 JavaScript로 작성됨
