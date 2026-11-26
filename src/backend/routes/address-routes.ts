import { FastifyInstance } from 'fastify';
import { addressController } from '../controllers/address-controller.js';
import { authenticate } from '../middlewares/auth-middleware.js';

export async function addressRoutes(server: FastifyInstance) {
  server.get('/profile/addresses', { preHandler: authenticate }, addressController.listAddresses);
  server.post('/profile/addresses', { preHandler: authenticate }, addressController.createAddress);
  server.patch('/profile/addresses/:id', { preHandler: authenticate }, addressController.updateAddress);
  server.patch('/profile/addresses/:id/default', { preHandler: authenticate }, addressController.setDefaultAddress);
  server.delete('/profile/addresses/:id', { preHandler: authenticate }, addressController.deleteAddress);
}
