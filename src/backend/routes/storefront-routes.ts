import { FastifyInstance } from 'fastify';
import { storefrontController } from '../controllers/storefront-controller.js';

export async function storefrontRoutes(server: FastifyInstance) {
  server.get('/storefront/categories', storefrontController.getCategories);
  server.get('/storefront/products', storefrontController.getProducts);
  server.get('/storefront/products/:id', storefrontController.getProductDetails);
  server.get('/storefront/suggestions', storefrontController.getSearchSuggestions);
}