# CLAUDE.md

이 파일은 이 레포에서 작업하는 **코딩 에이전트**를 위한 개발 가이드입니다. (사용자/운영 문서 제외)

## Project Overview

실험적 하이브리드 아키텍처 프로젝트로, Clean Architecture 원칙을 기반으로 합니다.
- **Domain Layer**: Gleam으로 구현 (타입 안정성, Sum Type 활용)
- **Application/Infrastructure Layer**: TypeScript + Bun + Hono로 구현

## Directory Structure (핵심)

```
gleam-domain-typescript-application-hybrid/
├── CLAUDE.md
├── README.md
├── package.json             # 루트 스크립트(workspaces)
├── setup.sh                 # 초기 설정(gleam build + bun install + db migrate)
├── core/                    # Domain Layer (Gleam)
│   ├── src/                 # Aggregate/Domain Events/FFI
│   ├── test/                # Gleam unit tests
│   └── build/               # 생성물(컴파일 출력)
│
└── main/                    # Application/Infrastructure (TypeScript + Bun + Hono)
    ├── src/
    │   ├── index.ts         # 서버 엔트리포인트
    │   ├── api/             # Routes/DTO
    │   ├── use-cases/       # 유스케이스(플로우 조율)
    │   ├── db/              # schema.sql/migrate.ts/repositories
    │   └── domain/          # Gleam 도메인 모델 래퍼/Result 처리
    ├── data/                # SQLite 데이터베이스 파일
    └── test-*.hurl          # API E2E 테스트
```

## Development Commands

### Quick Start (자동 설정)
```bash
# 모든 설정을 자동으로 실행
bun run setup

# 개발 서버 시작(기본 포트: 3000)
bun run dev
```

### 초기 설정 (수동)
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

### 루트 디렉토리 스크립트
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

## 코딩 에이전트용 작업 규칙 (아키텍처)

- **도메인 규칙은 `core/`에서 강제**: 상태 전환/검증 로직을 TypeScript로 복제하지 않습니다.
- **Opaque 타입 준수**: `core/`의 Aggregate 내부 상태는 직접 접근하지 않고, 도메인 모듈의 getter/함수로만 다룹니다.
- **Repository는 재구성(reconstitute) + 검증 포함**: DB 행 → 도메인 모델 변환 시 도메인 검증을 통과한 모델만 반환합니다.
- **Result → 예외 변환 경로 유지**: TypeScript에서 Gleam `Result(T, E)`는 공용 헬퍼로 unwrap하고, 에러는 애플리케이션 에러로 변환합니다.

## 테스트

- **전체 테스트(권장)**: `bun run test`
- **Gleam 유닛 테스트**: `cd core && gleam test`
- **TypeScript 유닛 테스트**: `cd main && bun test` (`*.test.ts`)
- **E2E(hurl)**: `bun run test:e2e` 또는 `cd main && bun run test:*` (`main/test-*.hurl`)

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

## Key Patterns (파일 경로)

### Clean Architecture Layers
1. **Domain (core/)**: 비즈니스 로직, Aggregate, Events - Gleam
2. **Application (main/src/api/)**: Use Cases, API Routes - TypeScript
3. **Infrastructure (main/src/db/)**: Database, Repository - TypeScript

### Gleam ↔ TypeScript 통신
- Gleam 코드는 JavaScript로 컴파일되어 Bun 런타임 위에서 실행됨
- **중요**: Gleam 자체 런타임을 사용하지 않고, TypeScript/Bun 서버 환경에서 동작
- `core/package.json`의 `exports` 필드를 통해 TypeScript에서 Gleam 모듈 import

### DateTime 처리
- **Gleam**: Unix timestamp (밀리초, Int 타입) - `pub type DateTime = Int`
- **TypeScript**: number 타입 - `export type DateTime = number`
- **SQLite**: INTEGER 타입으로 저장
- **JavaScript 호환**: `Date.now()` 반환값과 직접 호환
### 주요 파일/디렉토리
- 도메인(Aggregate/Events): `core/src/*.gleam`
- FFI: `core/src/common_ffi.mjs`, `core/src/domain_event_ffi.mjs`
- 서버 엔트리: `main/src/index.ts`
- API 라우트/테스트: `main/src/api/routes/*.routes.ts`, `main/src/api/routes/*.test.ts`
- 유스케이스: `main/src/use-cases/**`
- DB 스키마/마이그레이션: `main/src/db/schema.sql`, `main/src/db/migrate.ts`
- Repository: `main/src/db/repositories/*.repository.ts`
- Result unwrap: `main/src/domain/core-domain.ts`

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
- TypeScript에서 `unwrapResult()` 헬퍼로 변환 (`main/src/domain/core-domain.ts`)
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
