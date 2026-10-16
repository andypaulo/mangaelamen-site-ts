import { FastifyInstance } from 'fastify';
import { categoryController } from '../controllers/category-controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth-middleware.js';
 
export async function categoryRoutes(app: FastifyInstance) {
  // Leitura é pública (a vitrine precisa listar categorias sem estar logado)
  app.get('/categories', categoryController.list);
  app.get('/categories/:id', categoryController.getById);
 
  // Escrita só pra admin autenticado. requireAdmin roda depois de
  // authenticate no preHandler, exatamente como o comentário no seu
  // auth-middleware.ts pede ("Deve rodar SEMPRE depois de authenticate").
  app.post('/categories', { preHandler: [authenticate, requireAdmin] }, categoryController.create);
  app.put('/categories/:id', { preHandler: [authenticate, requireAdmin] }, categoryController.update);
  app.delete('/categories/:id', { preHandler: [authenticate, requireAdmin] }, categoryController.delete);
}
 