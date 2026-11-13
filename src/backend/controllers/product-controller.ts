import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

export const productController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { id: 'asc' }
    });
    return reply.status(200).send(products);
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const productId = Number(id);

    if (isNaN(productId)) {
      throw new AppError('Invalid product ID', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product || product.deletedAt) {
      throw new AppError('Product not found', 404);
    }

    return reply.status(200).send(product);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { name, description, price, stock, image, categoryId } = request.body as {
      name: string;
      description?: string;
      price: number;
      stock?: number;
      image?: string;
      categoryId: number;
    };

    if (!name || price === undefined || !categoryId) {
      throw new AppError('Name, price and categoryId are required', 400);
    }

    const categoryExists = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!categoryExists) {
      throw new AppError('Target category not found', 404);
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
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
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
      throw new AppError('Invalid product ID', 400);
    }

    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists || productExists.deletedAt) {
      throw new AppError('Product not found', 404);
    }

    const categoryExists = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!categoryExists) {
      throw new AppError('Target category not found', 404);
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
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const productId = Number(id);

    if (isNaN(productId)) {
      throw new AppError('Invalid product ID', 400);
    }

    const result = await prisma.product.updateMany({
      where: {
        id: productId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    if (result.count === 0) {
      throw new AppError('Product not found', 404);
    }

    return reply.status(200).send({ message: 'Product successfully removed' });
  }
};