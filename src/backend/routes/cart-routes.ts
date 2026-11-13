import { FastifyInstance } from 'fastify';
import { cartController } from '../controllers/cart-controller.js';
import { authenticate } from '../middlewares/auth-middleware.js';

export async function cartRoutes(server: FastifyInstance) {
  // Obter itens e total do carrinho
  server.get('/cart', { preHandler: authenticate }, cartController.getCart);
  server.get('/cart/items', { preHandler: authenticate }, cartController.getCart);

  // Adicionar item ao carrinho (suporta /cart/items e /cart/add)
  server.post('/cart/items', { preHandler: authenticate }, cartController.addItem);
  server.post('/cart/add', { preHandler: authenticate }, cartController.addItem);

  // Atualizar quantidade de item no carrinho
  server.put('/cart/items/:id', { preHandler: authenticate }, cartController.updateItemQuantity);
  server.patch('/cart/items/:id', { preHandler: authenticate }, cartController.updateItemQuantity);
  server.post('/cart/items/update', { preHandler: authenticate }, cartController.updateItemQuantity);
  server.post('/cart/alterar', { preHandler: authenticate }, cartController.updateItemQuantity);

  // Remover item do carrinho
  server.delete('/cart/items/:id', { preHandler: authenticate }, cartController.removeItem);
  server.post('/cart/items/delete', { preHandler: authenticate }, cartController.removeItem);
  server.post('/cart/excluir', { preHandler: authenticate }, cartController.removeItem);

  // Finalizar compra (checkout)
  server.post('/cart/checkout', { preHandler: authenticate }, cartController.checkout);
  server.post('/cart/finalizar', { preHandler: authenticate }, cartController.checkout);
}
