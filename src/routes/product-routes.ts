import { FastifyInstance } from 'fastify';
import { productController } from '../controllers/product-controller.js';

export async function productRoutes(server: FastifyInstance) {
  server.get('/products', productController.list);
  server.get('/products/:id', productController.getById);
  server.post('/products', productController.create);
  server.put('/products/:id', productController.update);
  server.delete('/products/:id', productController.delete);
}