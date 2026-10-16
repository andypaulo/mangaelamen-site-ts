import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

interface CartItemWithProduct {
  id: string;
  cartId: string;
  productId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    image: string;
    categoryId: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

export const cartController = {
  async addItem(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;
    const { productId, quantity } = request.body as { productId: number; quantity?: number };
    const reqQuantity = quantity || 1;

    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.stock < reqQuantity) {
      throw new AppError(`Insufficient stock for product: ${product.name}`, 400);
    }

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId }
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + reqQuantity;
      if (product.stock < newQuantity) {
        throw new AppError('Total quantity exceeds available stock', 400);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity: reqQuantity }
      });
    }

    return reply.status(200).send({ message: 'Item added to cart successfully' });
  },

  async getCart(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart) {
      return reply.status(200).send({ items: [], totalPrice: 0 });
    }

    const totalPrice = (cart.items as unknown as CartItemWithProduct[]).reduce((acc, item) => {
      return acc + (item.product.price * item.quantity);
    }, 0);

    return reply.status(200).send({ items: cart.items, totalPrice });
  },

  async checkout(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    const order = await prisma.$transaction(async (tx) => {
      let totalOrderPrice = 0;
      const orderItemsData = [];

      for (const item of (cart.items as unknown as CartItemWithProduct[])) {
        if (item.product.stock < item.quantity) {
          throw new AppError(`Out of stock: ${item.product.name}`, 400);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.product.stock - item.quantity }
        });

        totalOrderPrice += item.product.price * item.quantity;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: item.product.price
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          totalPrice: totalOrderPrice,
          status: 'PAID',
          items: { createMany: { data: orderItemsData } }
        },
        include: { items: true }
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return newOrder;
    });

    return reply.status(201).send({ message: 'Purchase completed successfully', order });
  }
};