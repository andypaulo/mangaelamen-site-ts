import { FastifyInstance } from 'fastify';
import { cartController } from '../controllers/cart-controller.js';

export async function cartRoutes(server: FastifyInstance) {
  server.post('/cart/items', cartController.addItem);
  server.get('/cart/:userId', cartController.getCart);
  server.post('/cart/checkout', cartController.checkout);
}