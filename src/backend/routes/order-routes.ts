import { FastifyInstance } from 'fastify';
import { orderController } from '../controllers/order-controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth-middleware.js';

export async function orderRoutes(app: FastifyInstance) {
  // Rotas do cliente logado (exigem authenticate)
  app.get('/orders', { preHandler: [authenticate] }, orderController.listUserOrders);
  app.get('/orders/:id', { preHandler: [authenticate] }, orderController.getUserOrderById);

  // Rotas do painel admin (exigem authenticate e requireAdmin)
  app.get('/admin/orders', { preHandler: [authenticate, requireAdmin] }, orderController.listAllOrdersAdmin);
  app.patch('/admin/orders/:id/status', { preHandler: [authenticate, requireAdmin] }, orderController.updateOrderStatusAdmin);
}
