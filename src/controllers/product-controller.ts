import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';

export const productController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const products = await prisma.product.findMany({
        include: { category: true },
        orderBy: { id: 'asc' }
      });
      return reply.status(200).send(products);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // Busca por ID
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const productId = Number(id);

      if (isNaN(productId)) {
        return reply.status(400).send({ message: 'Invalid product ID' });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true }
      });

      if (!product) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      return reply.status(200).send(product);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // CREATE
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, description, price, stock, image, categoryId } = request.body as {
        name: string;
        description?: string;
        price: number;
        stock?: number;
        image?: string;
        categoryId: number;
      };

      if (!name || price === undefined || !categoryId) {
        return reply.status(400).send({ message: 'Name, price and categoryId are required' });
      }

      const categoryExists = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
      if (!categoryExists) {
        return reply.status(404).send({ message: 'Target category not found' });
      }

      const newProduct = await prisma.product.create({
        data: {
          name,
          description: description ?? '',
          price: Number(price),
          stock: Number(stock ?? 0),
          image: image ?? 'sem-foto.jpg',
          categoryId: Number(categoryId)
        }
      });

      return reply.status(201).send(newProduct);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // UPDATE
  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const productId = Number(id);

      const { name, description, price, stock, image, categoryId } = request.body as {
        name: string;
        description?: string;
        price: number;
        stock?: number;
        image?: string;
        categoryId: number;
      };

      if (isNaN(productId)) {
        return reply.status(400).send({ message: 'Invalid product ID' });
      }

      const productExists = await prisma.product.findUnique({ where: { id: productId } });
      if (!productExists) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      const categoryExists = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
      if (!categoryExists) {
        return reply.status(404).send({ message: 'Target category not found' });
      }

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          name,
          description: description ?? '',
          price: Number(price),
          stock: Number(stock ?? 0),
          image: image ?? 'sem-foto.jpg',
          categoryId: Number(categoryId)
        }
      });

      return reply.status(200).send(updatedProduct);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // DELETE
  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const productId = Number(id);

      if (isNaN(productId)) {
        return reply.status(400).send({ message: 'Invalid product ID' });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      // Regra de Negocio: Impede a exclusao se houver unidades fisicas no estoque
      if (product.stock > 0) {
        return reply.status(400).send({
          message: 'It is not allowed to delete a product with stock greater than zero.'
        });
      }

      await prisma.product.delete({ where: { id: productId } });
      return reply.status(200).send({ message: 'Product successfully removed' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  }
};