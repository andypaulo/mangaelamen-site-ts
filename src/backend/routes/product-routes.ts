import { FastifyInstance } from 'fastify';
import { productController } from '../controllers/product-controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth-middleware.js';

export async function productRoutes(server: FastifyInstance) {
  server.get('/products', productController.list);
  server.get('/products/:id', productController.getById);
  server.post('/products', { preHandler: [authenticate, requireAdmin] }, productController.create);
  server.put('/products/:id', { preHandler: [authenticate, requireAdmin] }, productController.update);
  server.delete('/products/:id', { preHandler: [authenticate, requireAdmin] }, productController.delete);
}