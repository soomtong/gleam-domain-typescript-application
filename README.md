# Domain-Application Hybrid Architecture

Clean Architecture 원칙을 기반으로 한 실험적 하이브리드 프로젝트입니다.

**핵심 아이디어**: 도메인 로직은 강타입 함수형 언어로, 애플리케이션 레이어는 생산성 높은 언어로 분리

- **Domain Layer** (Gleam): 타입 안정성, Sum Types, 불변성
- **Application/Infrastructure Layer** (TypeScript + Bun): 빠른 개발, 풍부한 생태계

이커머스 도메인(Product, Coupon, Cart, Order, Payment)을 구현하여 아키텍처를 검증합니다.

## 🏗️ 프로젝트 구조

```
gleam-domain-typescript-application-hybrid/
├── CLAUDE.md
├── README.md
├── setup.sh
├── core/                    # Domain Layer (Gleam)
│   ├── src/
│   │   ├── common.gleam     # DateTime 타입, 공통 유틸리티
│   │   ├── common_ffi.mjs   # Gleam ↔ JavaScript FFI
│   │   ├── product.gleam    # Product Aggregate
│   │   ├── coupon.gleam     # Coupon Aggregate
│   │   ├── cart.gleam       # Cart Aggregate
│   │   ├── order.gleam      # Order Aggregate
│   │   ├── payment.gleam    # Payment Aggregate
│   │   ├── domain_event.gleam     # Domain Events
│   │   └── domain_event_ffi.mjs   # Domain Events FFI
│   ├── test/                # Gleam unit tests
│   ├── build/               # Gleam 컴파일 출력 (JavaScript)
│   ├── gleam.toml
│   ├── manifest.toml
│   └── package.json
│
└── main/                    # Application/Infrastructure (TypeScript + Bun)
    ├── src/
    │   ├── index.ts         # Hono 서버 엔트리포인트
    │   ├── config/          # 설정 (DB 연결)
    │   ├── db/              # 데이터베이스 (스키마, Repository, 마이그레이션)
    │   ├── api/             # API Routes, DTO
    │   │   ├── dto/
    │   │   └── routes/
    │   │       └── _shared/
    │   ├── domain/          # 도메인 모델 래퍼
    │   └── use-cases/       # 복잡한 비즈니스 플로우 (Checkout 등)
    ├── data/                # SQLite 데이터베이스
    ├── test-*.hurl          # API E2E 테스트 (hurl)
    ├── package.json
    ├── tsconfig.json
    └── bun.lock
```

## 🚀 시작하기

### 사전 요구사항

- [Gleam](https://gleam.run/) >= 1.0.0
- [Bun](https://bun.sh/) >= 1.0.0
- [hurl](https://hurl.dev/) (선택적, API 테스트용)

### Quick Start (자동 설정)

```bash
# 모든 설정을 자동으로 실행
./setup.sh

# 또는 bun 사용
bun run setup

# 개발 서버 시작
bun run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 수동 설정

```bash
# 1. Gleam 도메인 레이어 빌드
cd core
gleam build

# 2. TypeScript 의존성 설치
cd ../main
bun install

# 3. 데이터베이스 마이그레이션
bun run db:migrate

# 4. 개발 서버 실행 (Gleam 자동 빌드 포함)
bun dev
```

## 🛠️ 개발 명령어

### 루트 디렉토리 (편리한 스크립트)
```bash
bun run setup        # 전체 초기 설정 (Gleam 빌드 + 의존성 설치 + DB 마이그레이션)
bun run dev          # 개발 서버 실행
bun run build        # 프로덕션 빌드 (Gleam + TypeScript)
bun run test         # 모든 테스트 실행 (Gleam + TypeScript)
bun run test:e2e     # E2E 테스트 실행
bun run db:reset     # 데이터베이스 초기화
bun run format       # Gleam 코드 포맷팅
```

### Gleam (core/)
```bash
cd core
gleam build          # Gleam 컴파일
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
```

## 📡 API 엔드포인트

### Products

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/products` | 모든 상품 조회 |
| GET | `/products/:id` | 상품 ID로 조회 |
| POST | `/products` | 새 상품 생성 |
| PATCH | `/products/:id/stock` | 재고 업데이트 |

### Coupons

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/coupons` | 모든 쿠폰 조회 |
| GET | `/coupons/active` | 활성 쿠폰 조회 |
| GET | `/coupons/:code` | 쿠폰 코드로 조회 |
| POST | `/coupons` | 새 쿠폰 생성 |
| POST | `/coupons/:code/calculate` | 할인 금액 계산 |

### Carts

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/carts` | 모든 장바구니 조회 |
| GET | `/carts/active` | 활성 장바구니 조회 |
| GET | `/carts/:id` | 장바구니 ID로 조회 |
| POST | `/carts` | 새 장바구니 생성 |
| PATCH | `/carts/:id/coupon` | 쿠폰 추가/제거 |
| PATCH | `/carts/:id/quantity` | 수량 변경 |
| POST | `/carts/:id/checkout` | 장바구니 체크아웃 (Order 생성) |

### Orders

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/orders` | 모든 주문 조회 |
| GET | `/orders/:id` | 주문 ID로 조회 |
| POST | `/orders` | 새 주문 생성 |
| POST | `/orders/:id/confirm` | 주문 확정 |
| POST | `/orders/:id/cancel` | 주문 취소 |
| POST | `/orders/:id/complete` | 주문 완료 |

### Payments

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/payments` | 모든 결제 조회 |
| GET | `/payments/:id` | 결제 ID로 조회 |
| POST | `/payments` | 새 결제 생성 |
| POST | `/payments/:id/complete` | 결제 완료 |
| POST | `/payments/:id/fail` | 결제 실패 |
| POST | `/payments/:id/refund` | 환불 처리 |

### 예제 요청

**상품 생성:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Gleam Programming Book",
    "price": 45000,
    "stock": 100,
    "begin_at": 1735689600000,
    "end_at": 1767225599000
  }'
```

**쿠폰 생성 및 할인 계산:**
```bash
# 쿠폰 생성
curl -X POST http://localhost:3000/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "discount_type": "Percentage",
    "discount_value": 10,
    "valid_from": 1735689600000,
    "valid_until": 1767225599000
  }'

# 할인 계산
curl -X POST http://localhost:3000/coupons/WELCOME10/calculate \
  -H "Content-Type: application/json" \
  -d '{"original_price": 50000}'
```

**장바구니 생성 및 쿠폰 적용:**
```bash
# 장바구니 생성
curl -X POST http://localhost:3000/carts \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 2,
    "expired_at": 1735257600000,
    "keep_until": 1735344000000
  }'

# 쿠폰 적용
curl -X PATCH http://localhost:3000/carts/1/coupon \
  -H "Content-Type: application/json" \
  -d '{"coupon_id": 1}'

# 장바구니 체크아웃 (Order 자동 생성, 재고 감소)
curl -X POST http://localhost:3000/carts/1/checkout
```

**주문 생성 및 결제:**
```bash
# 주문 생성
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "cart_id": 1,
    "product_id": 1,
    "coupon_id": 1,
    "quantity": 2,
    "paid_amount": 90000,
    "discount_amount": 10000
  }'

# 주문 확정
curl -X POST http://localhost:3000/orders/1/confirm

# 결제 생성
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "amount": 90000
  }'

# 결제 완료
curl -X POST http://localhost:3000/payments/1/complete

# 환불 처리
curl -X POST http://localhost:3000/payments/1/refund
```

## 🧪 테스트

### Gleam 유닛 테스트
```bash
cd core
gleam test           # 모든 도메인 로직 테스트 실행
```

### TypeScript 유닛 테스트
```bash
cd main
bun test             # Use Case 및 Repository 테스트 실행
```

### API E2E 테스트 (hurl)

**참고**: 테스트 실행 전 데이터베이스를 초기화하려면:
```bash
cd main
rm data/app.db*          # 데이터베이스 삭제
bun run db:migrate       # 새로 마이그레이션
```

```bash
# Product API 테스트
bun run test:product

# Coupon & Cart API 테스트
bun run test:coupon-cart

# Order & Payment API 테스트
bun run test:order-payment

# Cart Checkout Use Case 테스트
bun run test:checkout

# 상세 출력
bun run test:product:verbose
bun run test:coupon-cart:verbose
bun run test:order-payment:verbose
bun run test:checkout:verbose
```

### 테스트 파일

**`main/test-product.hurl`** - Product API (8개 시나리오)
- ✅ Health check
- ✅ Product CRUD (생성, 조회, 목록)
- ✅ Stock 업데이트 (0으로 설정 시 OutOfStock 자동 전환)
- ✅ 유효성 검증 (음수 가격, 존재하지 않는 상품)

**`main/test-coupon-cart.hurl`** - Coupon & Cart API (18개 시나리오)
- ✅ Coupon 생성 (퍼센트, 고정 금액)
- ✅ Coupon 조회 및 할인 계산
- ✅ Cart CRUD (생성, 조회, 목록)
- ✅ Cart에 쿠폰 적용/제거
- ✅ Cart 수량 변경
- ✅ 유효성 검증 (재고 부족, 중복 쿠폰 등)

**`main/test-order-payment.hurl`** - Order & Payment API (18개 시나리오)
- ✅ Order 생성 (Cart 기반)
- ✅ Order 조회 및 상태 전환 (Pending → Confirmed → Completed)
- ✅ Order 취소 처리
- ✅ Payment 생성 (Confirmed Order에만 가능)
- ✅ Payment 완료 (Order도 자동으로 Completed)
- ✅ Payment 실패 처리
- ✅ 환불 처리 (Completed → Refunded)
- ✅ 유효성 검증 (잘못된 상태 전환, 음수 금액 등)

**`main/test-checkout-cart.hurl`** - Cart Checkout Use Case (6개 시나리오)
- ✅ 장바구니 체크아웃 (쿠폰 있음/없음)
- ✅ Order 자동 생성
- ✅ 재고 자동 감소
- ✅ 쿠폰 할인 자동 적용
- ✅ Cart 상태 CheckedOut 전환
- ✅ 트랜잭션 무결성 (재고 부족 시 롤백)
- ✅ 체크아웃된 Cart 수정 방지

## 🎯 도메인 모델

### Aggregates

- **Product**: 상품 관리 (재고, 가격, 판매 기간)
- **Coupon**: 쿠폰 관리 (할인 타입, 유효 기간)
- **Cart**: 장바구니 (상품, 쿠폰, 수량)
- **Order**: 주문 (결제 금액, 할인 금액)
- **Payment**: 결제 (결제 상태, 환불)

### Domain Flows

1. `product → cart → order`
2. `coupon → order → payment`

### 비즈니스 규칙

- 재고가 0이 되면 자동으로 `ProductStatus.OutOfStock`으로 전환
- 쿠폰은 유효 기간 내에서만 사용 가능
- 장바구니는 만료 시간(`expired_at`) 이후 `CartStatus.Expired`로 전환
- 주문 상태 전환: `Pending → Confirmed → Completed` 또는 `Pending → Cancelled`
- 결제는 `Confirmed` 상태의 주문에만 생성 가능
- 결제 완료 시 주문도 자동으로 `Completed` 상태로 전환
- Cart Checkout 시 자동으로 Order 생성 및 재고 감소 (트랜잭션 처리)

## 🔧 기술 스택

### Domain Layer
- **Gleam**: 타입 안정성, Sum Types, 패턴 매칭
- **FFI**: JavaScript와의 상호운용

### Application/Infrastructure Layer
- **Bun**: 빠른 JavaScript 런타임
- **Hono**: 경량 웹 프레임워크
- **SQLite**: 파일 기반 데이터베이스 (bun:sqlite)
- **TypeScript**: 타입 안정성

## 📝 주요 아키텍처 결정사항

### Gleam → TypeScript 통합

Gleam 코드는 JavaScript로 컴파일되어 Bun 런타임에서 실행됩니다.
- Gleam 자체 런타임을 사용하지 않음
- TypeScript/Bun 서버 환경에서 동작
- `core/package.json`의 `exports` 필드를 통해 TypeScript에서 Gleam 모듈 import
- 도메인 로직의 타입 안정성 확보
- **중요**: Gleam의 `opaque type`으로 캡슐화 강제 - getter 함수로만 접근 가능

### DateTime 처리

- **Gleam**: Unix timestamp (밀리초, Int 타입) - `pub type DateTime = Int`
- **TypeScript**: number 타입 - `export type DateTime = number`
- **SQLite**: INTEGER 타입으로 저장
- **JavaScript 호환**: `Date.now()` 반환값과 직접 호환
- **예시**: `1735257600000` (2025-12-26T18:00:00.000Z)

### 데이터베이스

- **bun:sqlite** 사용 (Bun 내장 SQLite 모듈)
- WAL 모드, 외래키 제약조건 활성화
- 자동 증가 정수(Int) ID 전략 (`AUTOINCREMENT`)

### Result 타입과 에러 처리

- Gleam은 `Result(T, E)` 타입 사용 (예외 없음)
- TypeScript에서 `unwrapResult()` 헬퍼로 Result를 값으로 변환
- 에러 발생 시 `DomainError` 예외로 변환되어 HTTP 에러 응답 생성

### Repository 패턴

- Repository는 Gleam 도메인 모델을 직접 반환/저장
- `reconstitute()` 함수로 DB 데이터를 도메인 모델로 재구성 (유효성 검증 포함)
- 모든 도메인 규칙은 Gleam 레이어에서 강제됨

## 🎓 학습 포인트

이 프로젝트는 다음을 실험하고 검증합니다:

### 1. 타입 안정성의 계층화
- **Domain Layer**: Gleam의 강력한 타입 시스템으로 비즈니스 규칙 보호
- **Application Layer**: TypeScript로 유연한 통합 및 API 제공
- **경계**: `Result` 타입과 `reconstitute` 패턴으로 안전한 데이터 변환

### 2. Sum Types의 실전 활용
```gleam
pub type OrderStatus {
  Pending
  Confirmed
  Cancelled
  Completed
}
```
- 불가능한 상태를 컴파일 타임에 방지
- 패턴 매칭으로 모든 케이스 강제 처리

### 3. Clean Architecture의 실용적 구현
- **의존성 규칙**: Domain → Application → Infrastructure
- **Repository 패턴**: 도메인 모델 직접 반환 (DTO 변환 없음)
- **Use Cases**: 복잡한 비즈니스 플로우 조율 (checkout-cart.use-case.ts)

### 4. FFI (Foreign Function Interface)
- Gleam ↔ JavaScript 연동 (`common_ffi.mjs`, `domain_event_ffi.mjs`)
- 런타임 통합 (Bun에서 Gleam 코드 직접 실행)

## 📚 현재 구현 상태

### 완료된 기능
- ✅ **5개 Aggregate** - Product, Coupon, Cart, Order, Payment
- ✅ **Domain Events** - 10가지 이벤트 타입 정의
- ✅ **REST API** - 26개 엔드포인트
- ✅ **Checkout Use Case** - Cart → Order 플로우 (트랜잭션, 재고 감소, 쿠폰 적용)
- ✅ **50개 E2E 테스트** - hurl 기반 API 테스트

### 추가 가능한 기능
1. **이벤트 발행 시스템** - Domain Events를 실제로 발행/구독
2. **전체 주문 플로우** - Cart → Order → Payment 완전 자동화
3. **재고 예약** - 장바구니 생성 시 재고 일시 예약
4. **사용자 인증** - JWT 기반 인증/인가
5. **GraphQL API** - REST 대신 GraphQL 엔드포인트 제공

## 🔗 관련 문서

- **CLAUDE.md**: Claude Code를 위한 프로젝트 가이드 (개발 워크플로우, 구현 노트 등)
- [Gleam 공식 문서](https://gleam.run/)
- [Bun 공식 문서](https://bun.sh/)
- [Hono 공식 문서](https://hono.dev/)

## 📄 라이선스

MIT
