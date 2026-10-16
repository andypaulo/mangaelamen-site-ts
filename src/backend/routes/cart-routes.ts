import { FastifyInstance } from 'fastify';
import { cartController } from '../controllers/cart-controller.js';
import { authenticate } from '../middlewares/auth-middleware.js';

export async function cartRoutes(server: FastifyInstance) {
  server.post('/cart/items', { preHandler: authenticate }, cartController.addItem);
  server.get('/cart', { preHandler: authenticate }, cartController.getCart);
  server.post('/cart/checkout', { preHandler: authenticate }, cartController.checkout);
}