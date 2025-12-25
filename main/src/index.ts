import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import productRoutes from './api/routes/product.routes';
import couponRoutes from './api/routes/coupon.routes';
import cartRoutes from './api/routes/cart.routes';
import orderRoutes from './api/routes/order.routes';
import paymentRoutes from './api/routes/payment.routes';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Domain-Application Hybrid API Server',
    version: '1.0.0',
    endpoints: {
      products: '/products',
      coupons: '/coupons',
      carts: '/carts',
      orders: '/orders',
      payments: '/payments',
    },
  });
});

// Routes
app.route('/products', productRoutes);
app.route('/coupons', couponRoutes);
app.route('/carts', cartRoutes);
app.route('/orders', orderRoutes);
app.route('/payments', paymentRoutes);

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: err.message || 'Internal server error',
    },
    500
  );
});

// Start server
const port = process.env.PORT || 3000;

console.log(`🚀 Server starting on http://localhost:3000`);
console.log(`📡 Available endpoints:`);
console.log(`   - GET  /products`);
console.log(`   - GET  /coupons`);
console.log(`   - GET  /carts`);
console.log(`   - GET  /orders`);
console.log(`   - GET  /payments`);

export default {
  port,
  fetch: app.fetch,
};
