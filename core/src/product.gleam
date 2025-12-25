import common.{type DateTime}

pub type ProductError {
  ProductIdMustBePositive(message: String)
  PriceCannotBeNegative(message: String)
  StockCannotBeNegative(message: String)
  TitleCannotBeEmpty(message: String)
  StockDecreaseAmountCannotBeNegative(message: String)
  InsufficientStock(message: String)
  StockIncreaseAmountCannotBeNegative(message: String)
}

/// Product status enumeration
pub type ProductStatus {
  Active
  Inactive
  OutOfStock
}

/// Product aggregate
pub opaque type Product {
  Product(
    product_id: Int,
    title: String,
    price: Int,
    stock: Int,
    begin_at: DateTime,
    end_at: DateTime,
    status: ProductStatus,
    created_at: DateTime,
    updated_at: DateTime,
  )
}

/// Create a new product
pub fn create(
  product_id: Int,
  title: String,
  price: Int,
  stock: Int,
  begin_at: DateTime,
  end_at: DateTime,
) -> Result(Product, ProductError) {
  // Validation
  case price < 0 {
    True -> Error(PriceCannotBeNegative("Price cannot be negative"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case stock < 0 {
      True -> Error(StockCannotBeNegative("Stock cannot be negative"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case title == "" {
      True -> Error(TitleCannotBeEmpty("Title cannot be empty"))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    let now = common.now()
    let status = case stock {
      0 -> OutOfStock
      _ -> Active
    }

    Product(
      product_id: product_id,
      title: title,
      price: price,
      stock: stock,
      begin_at: begin_at,
      end_at: end_at,
      status: status,
      created_at: now,
      updated_at: now,
    )
  })
}

/// Assign persisted ID after storage
pub fn assign_id(
  product: Product,
  product_id: Int,
) -> Result(Product, ProductError) {
  case product_id <= 0 {
    True -> Error(ProductIdMustBePositive("Product id must be positive"))
    False -> Ok(Product(..product, product_id: product_id))
  }
}

/// Reconstitute product from persistence
pub fn reconstitute(
  product_id: Int,
  title: String,
  price: Int,
  stock: Int,
  begin_at: DateTime,
  end_at: DateTime,
  status: ProductStatus,
  created_at: DateTime,
  updated_at: DateTime,
) -> Result(Product, ProductError) {
  case product_id <= 0 {
    True -> Error(ProductIdMustBePositive("Product id must be positive"))
    False -> Ok(Nil)
  }
  |> result_and(fn(_) {
    case price < 0 {
      True -> Error(PriceCannotBeNegative("Price cannot be negative"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case stock < 0 {
      True -> Error(StockCannotBeNegative("Stock cannot be negative"))
      False -> Ok(Nil)
    }
  })
  |> result_and(fn(_) {
    case title == "" {
      True -> Error(TitleCannotBeEmpty("Title cannot be empty"))
      False -> Ok(Nil)
    }
  })
  |> result_map(fn(_) {
    Product(
      product_id: product_id,
      title: title,
      price: price,
      stock: stock,
      begin_at: begin_at,
      end_at: end_at,
      status: status,
      created_at: created_at,
      updated_at: updated_at,
    )
  })
}

pub fn product_id(product: Product) -> Int {
  let Product(product_id: product_id, ..) = product
  product_id
}

pub fn title(product: Product) -> String {
  let Product(title: title, ..) = product
  title
}

pub fn price(product: Product) -> Int {
  let Product(price: price, ..) = product
  price
}

pub fn stock(product: Product) -> Int {
  let Product(stock: stock, ..) = product
  stock
}

pub fn begin_at(product: Product) -> DateTime {
  let Product(begin_at: begin_at, ..) = product
  begin_at
}

pub fn end_at(product: Product) -> DateTime {
  let Product(end_at: end_at, ..) = product
  end_at
}

pub fn status(product: Product) -> ProductStatus {
  let Product(status: status, ..) = product
  status
}

pub fn created_at(product: Product) -> DateTime {
  let Product(created_at: created_at, ..) = product
  created_at
}

pub fn updated_at(product: Product) -> DateTime {
  let Product(updated_at: updated_at, ..) = product
  updated_at
}

/// Update product stock
/// Automatically changes status to OutOfStock if stock becomes 0
pub fn update_stock(
  product: Product,
  new_stock: Int,
) -> Result(Product, ProductError) {
  case new_stock < 0 {
    True -> Error(StockCannotBeNegative("Stock cannot be negative"))
    False -> {
      let new_status = case new_stock {
        0 -> OutOfStock
        _ ->
          case product.status {
            OutOfStock -> Active
            status -> status
          }
      }

      Ok(
        Product(
          ..product,
          stock: new_stock,
          status: new_status,
          updated_at: common.now(),
        ),
      )
    }
  }
}

/// Decrease stock by a given amount
pub fn decrease_stock(
  product: Product,
  amount: Int,
) -> Result(Product, ProductError) {
  case amount < 0 {
    True ->
      Error(StockDecreaseAmountCannotBeNegative(
        "Decrease amount cannot be negative",
      ))
    False -> {
      let new_stock = product.stock - amount
      case new_stock < 0 {
        True -> Error(InsufficientStock("Insufficient stock"))
        False -> update_stock(product, new_stock)
      }
    }
  }
}

/// Increase stock by a given amount
pub fn increase_stock(
  product: Product,
  amount: Int,
) -> Result(Product, ProductError) {
  case amount < 0 {
    True ->
      Error(StockIncreaseAmountCannotBeNegative(
        "Increase amount cannot be negative",
      ))
    False -> {
      let new_stock = product.stock + amount
      update_stock(product, new_stock)
    }
  }
}

/// Change product status manually
pub fn change_status(product: Product, new_status: ProductStatus) -> Product {
  Product(..product, status: new_status, updated_at: common.now())
}

/// Update product price
pub fn update_price(
  product: Product,
  new_price: Int,
) -> Result(Product, ProductError) {
  case new_price < 0 {
    True -> Error(PriceCannotBeNegative("Price cannot be negative"))
    False -> Ok(Product(..product, price: new_price, updated_at: common.now()))
  }
}

/// Check if product is available for purchase
pub fn is_available(product: Product) -> Bool {
  case product.status {
    Active -> product.stock > 0
    _ -> False
  }
}

// Helper functions for Result chaining
fn result_and(result: Result(a, e), next: fn(a) -> Result(b, e)) -> Result(b, e) {
  case result {
    Ok(value) -> next(value)
    Error(err) -> Error(err)
  }
}

fn result_map(result: Result(a, e), mapper: fn(a) -> b) -> Result(b, e) {
  case result {
    Ok(value) -> Ok(mapper(value))
    Error(err) -> Error(err)
  }
}
