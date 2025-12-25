# Gleam Domain Driven Design (DDD) Principles

본 문서는 **Gleam 언어를 기반으로 한 도메인 드리븐 디자인(DDD) 표준 가이드**이다.
코딩용 에이전트 및 팀 개발자가 **일관된 도메인 모델링과 구현 규율**을 유지하도록 돕는 것을 목적으로 한다.

---

## 1. 핵심 철학

### 1.1 모든 도메인 타입은 Sum Type이다

- Gleam에는 `struct` 개념이 없다
- 모든 사용자 정의 타입은 **Sum type (Tagged Union)** 이다
- 단일 생성자 타입 또한 “선택지가 하나뿐인 Sum type”으로 취급한다

```gleam
pub type User {
  User(name: String, age: Int)
}
```

> 단순 데이터 구조가 아니라 **도메인 개념의 표현 단위**로 다룬다.

---

## 2. 생성자 통제 원칙 (Invariant Protection)

### 2.1 생성자는 기본적으로 감춘다

```gleam
pub type Account {
  Account(id: Int, balance: Money)
}
```

- `pub type` → 타입 이름만 외부 공개
- 생성자는 기본적으로 **private**
- 외부에서 `Account(...)` 직접 호출 불가

### 2.2 Smart Constructor만 공개한다

```gleam
pub fn new_account(
  id: Int,
  initial_balance: Money,
) -> Result(Account, AccountError)
```

- 모든 도메인 불변성은 **생성 시점에만 검사**
- Invalid state는 시스템에 존재할 수 없음

> Make illegal states unrepresentable

---

## 3. Value Object 설계 규칙

### 3.1 Value Object는 단일 생성자 Sum type으로 표현

```gleam
pub type Money {
  Money(amount: Int)
}
```

특징:
- 식별자 없음
- 불변
- 값이 같으면 동일한 의미

### 3.2 항상 Smart Constructor를 제공

```gleam
pub fn new(amount: Int) -> Result(Money, MoneyError)
```

- 생성자 직접 노출 금지
- 파싱, 검증, 변환은 생성자에서 수행

---

## 4. Aggregate Root 규율

### 4.1 Aggregate는 항상 타입 경계로 보호한다

```gleam
pub type Account {
  Account(id: Int, balance: Money)
}
```

- 외부에서는 상태 변경 불가
- 오직 도메인 함수(Command)만 허용

### 4.2 Command는 항상 새 상태를 반환한다

```gleam
pub fn deposit(
  account: Account,
  amount: Money,
) -> Account
```

- Mutation 금지
- Side effect 없음
- Event / Persistence는 상위 계층 책임

---

## 5. 실패는 도메인 에러로 표현한다

### 5.1 Bool / Exception 사용 금지

```gleam
pub type AccountError {
  InsufficientBalance
}
```

```gleam
pub fn withdraw(
  account: Account,
  amount: Money,
) -> Result(Account, AccountError)
```

- 실패는 **의미 있는 도메인 개념**
- 호출자는 반드시 처리해야 함

---

## 6. 상태 모델링 전략

### 6.1 단일 생성자에서 시작한다

```gleam
pub type Order {
  Order(id: OrderId, items: List(Item))
}
```

### 6.2 요구가 생길 때 다중 생성자로 진화

```gleam
pub type Order {
  Draft(id: OrderId, items: List(Item))
  Paid(id: OrderId, items: List(Item))
  Shipped(id: OrderId, tracking: String)
}
```

- Premature state modeling 금지
- 컴파일러가 상태 전이를 강제

---

## 7. Anemic Model 방지 규칙

### 7.1 필드 직접 접근 금지

❌ 안티패턴
```gleam
user.age
```

✅ 권장
```gleam
pub fn age(user: User) -> Int {
  let User(_, age) = user
  age
}
```

- 데이터는 감추고
- 행위는 타입 옆에 둔다

---

## 8. 테스트 및 내부용 생성자

### 8.1 테스트 전용 Unsafe Constructor 허용

```gleam
pub fn unsafe_money(amount: Int) -> Money
```

규칙:
- 테스트 모듈에서만 사용
- production code에서 호출 금지

---

## 9. 네이밍 규칙

| 목적 | 권장 이름 |
|----|---------|
| 생성 | `new_*` |
| 파싱 | `parse_*` |
| 변환 | `from_*` |
| 상태 변경 | 도메인 동사 (`deposit`, `withdraw`) |

일관성이 최우선이다.

---

## 10. 핵심 요약 (에이전트용 체크리스트)

- 모든 도메인 타입은 Sum type인가?
- 생성자가 외부에 노출되어 있는가?
- Smart Constructor가 불변성을 보장하는가?
- Command는 항상 새 상태를 반환하는가?
- 실패가 도메인 에러로 표현되는가?
- 상태 분기가 필요할 때만 생성자를 추가했는가?

---

> **Gleam에서 DDD란, 타입 시스템을 도메인 언어로 사용하는 것이다.**

