import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/app-error.js';

export const storefrontController = {
  async getProducts(request: FastifyRequest, reply: FastifyReply) {
    const { categoryId, search, page } = request.query as {
      categoryId?: string;
      search?: string;
      page?: string;
    };

    const limit = 12;
    const currentPage = Math.max(1, Number(page || 1));
    const offset = (currentPage - 1) * limit;

    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (categoryId) {
      whereClause.categoryId = Number(categoryId);
    }

    if (search) {
      whereClause.name = { contains: search };
    }

    const totalProducts = await prisma.product.count({ where: whereClause });
    const totalPages = Math.max(1, Math.ceil(totalProducts / limit));

    const products = await prisma.product.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: [{ stock: 'desc' }, { id: 'asc' }],
      include: { category: true }
    });

    return reply.status(200).send({
      products,
      pagination: { currentPage, totalPages, totalProducts }
    });
  },

  async getProductDetails(request: FastifyRequest, reply: FastifyReply) {
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

    const relatedProducts = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, deletedAt: null },
      take: 4,
      select: { id: true, name: true, price: true, image: true, categoryId: true }
    });

    return reply.status(200).send({ product, relatedProducts });
  },

  async getSearchSuggestions(request: FastifyRequest, reply: FastifyReply) {
    const { search } = request.query as { search: string };
    if (!search || search.length < 2) return reply.status(200).send([]);

    const suggestions = await prisma.product.findMany({
      where: { name: { contains: search }, deletedAt: null },
      take: 5,
      select: { id: true, name: true }
    });

    return reply.status(200).send(suggestions);
  }
};