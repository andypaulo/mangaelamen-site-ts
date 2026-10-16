import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

export const categoryController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });
    return reply.status(200).send(categories);
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      throw new AppError('Invalid category ID', 400);
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return reply.status(200).send(category);
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { name, slug } = request.body as { name: string; slug?: string };

    if (!name) {
      throw new AppError('Name is required', 400);
    }

    // Se não vier slug, gera um a partir do nome (mesma ideia do slug em
    // "Shonen" -> "shonen"): minúsculo, sem acento, espaços viram hífen.
    const finalSlug = (slug ?? name)
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!finalSlug) {
      throw new AppError('Could not generate a valid slug for this category', 400);
    }

    const [nameExists, slugExists] = await Promise.all([
      prisma.category.findUnique({ where: { name } }),
      prisma.category.findUnique({ where: { slug: finalSlug } })
    ]);

    if (nameExists) {
      throw new AppError('A category with this name already exists', 409);
    }
    if (slugExists) {
      throw new AppError('A category with this slug already exists', 409);
    }

    const newCategory = await prisma.category.create({
      data: { name, slug: finalSlug }
    });

    return reply.status(201).send(newCategory);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      throw new AppError('Invalid category ID', 400);
    }

    const { name, slug } = request.body as { name?: string; slug?: string };

    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw new AppError('Category not found', 404);
    }

    if (name) {
      const nameTaken = await prisma.category.findFirst({
        where: { name, id: { not: categoryId } }
      });
      if (nameTaken) {
        throw new AppError('A category with this name already exists', 409);
      }
    }

    if (slug) {
      const slugTaken = await prisma.category.findFirst({
        where: { slug, id: { not: categoryId } }
      });
      if (slugTaken) {
        throw new AppError('A category with this slug already exists', 409);
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {})
      }
    });

    return reply.status(200).send(updatedCategory);
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      throw new AppError('Invalid category ID', 400);
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { products: true }
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category.products.length > 0) {
      throw new AppError('It is not allowed to delete a category that still has products', 400);
    }

    await prisma.category.delete({ where: { id: categoryId } });
    return reply.status(200).send({ message: 'Category successfully removed' });
  }
};
