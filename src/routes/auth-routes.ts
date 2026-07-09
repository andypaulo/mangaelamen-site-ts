import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth-controller.js';

export async function authRoutes(server: FastifyInstance) {
  server.post('/auth/register', authController.register);
  server.post('/auth/login', authController.login);
}