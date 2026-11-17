import { FastifyInstance } from 'fastify';
import { profileController } from '../controllers/profile-controller.js';
import { authenticate } from '../middlewares/auth-middleware.js';

export async function profileRoutes(server: FastifyInstance) {
  server.get('/profile', { preHandler: authenticate }, profileController.getProfile);
  server.patch('/profile', { preHandler: authenticate }, profileController.updateProfile);
  server.patch('/profile/password', { preHandler: authenticate }, profileController.updatePassword);
  server.get('/profile/summary', { preHandler: authenticate }, profileController.getSummary);
}
