import { Hono } from 'hono';
import type { CreateProductRequest, UpdateProductStockRequest } from '../dto/product.dto';
import { toProductResponse } from '../dto/product.dto';
import { handleRouteError, parseIntParamOrThrow } from './_shared/route-helpers';
import { ListProductsUseCase } from '../../use-cases/product/list-products.use-case';
import { GetProductUseCase } from '../../use-cases/product/get-product.use-case';
import { CreateProductUseCase } from '../../use-cases/product/create-product.use-case';
import { UpdateProductStockUseCase } from '../../use-cases/product/update-product-stock.use-case';

const listProductsUseCase = new ListProductsUseCase();
const getProductUseCase = new GetProductUseCase();
const createProductUseCase = new CreateProductUseCase();
const updateProductStockUseCase = new UpdateProductStockUseCase();

const app = new Hono();

// GET /products - 모든 상품 조회
app.get('/', (c) => {
  try {
    const products = listProductsUseCase.execute();
    return c.json({
      success: true,
      data: products.map(toProductResponse),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// GET /products/:id - 상품 ID로 조회
app.get('/:id', (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const product = getProductUseCase.execute(id);
    return c.json({
      success: true,
      data: toProductResponse(product),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// POST /products - 새 상품 생성
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateProductRequest>();
    const product = createProductUseCase.execute(body);

    return c.json(
      {
        success: true,
        data: toProductResponse(product),
      },
      201
    );
  } catch (error) {
    return handleRouteError(c, error);
  }
});

// PATCH /products/:id/stock - 상품 재고 업데이트
app.patch('/:id/stock', async (c) => {
  try {
    const id = parseIntParamOrThrow(c, 'id');
    const body = await c.req.json<UpdateProductStockRequest>();
    const product = updateProductStockUseCase.execute(id, body);

    return c.json({
      success: true,
      data: toProductResponse(product),
    });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

export default app;
