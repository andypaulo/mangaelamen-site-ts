import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';

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
  // Adiciona um item ao carrinho do usuario
  async addItem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, productId, quantity } = request.body as { userId: string; productId: number; quantity: number };
      const reqQuantity = quantity || 1;

      if (!userId || !productId) {
        return reply.status(400).send({ message: 'User ID and Product ID are required' });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      if (product.stock < reqQuantity) {
        return reply.status(400).send({ message: `Insufficient stock for product: ${product.name}` });
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
          return reply.status(400).send({ message: 'Total quantity exceeds available stock' });
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
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // Retorna o carrinho completo calculando o total com tipagem estrita contra Any implicito
  async getCart(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };

      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      if (!cart) {
        return reply.status(200).send({ items: [], totalPrice: 0 });
      }

      const totalPrice = (cart.items as unknown as CartItemWithProduct[]).reduce((acc: number, item: CartItemWithProduct) => {
        return acc + (item.product.price * item.quantity);
      }, 0);

      return reply.status(200).send({ items: cart.items, totalPrice });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // Finaliza a compra convertendo o carrinho em Pedido via transacao
  async checkout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.body as { userId: string };

      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: { include: { product: true } }
        }
      });

      if (!cart || cart.items.length === 0) {
        return reply.status(400).send({ message: 'Cart is empty' });
      }

      const order = await prisma.$transaction(async (tx) => {
        let totalOrderPrice = 0;
        const orderItemsData = [];

        for (const item of (cart.items as unknown as CartItemWithProduct[])) {
          if (item.product.stock < item.quantity) {
            throw new Error(`Out of stock: ${item.product.name}`);
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
            items: {
              createMany: { data: orderItemsData }
            }
          },
          include: { items: true }
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return newOrder;
      });

      return reply.status(201).send({ message: 'Purchase completed successfully', order });
    } catch (error: any) {
      request.log.error(error);
      if (error.message.startsWith('Out of stock:')) {
        return reply.status(400).send({ message: error.message });
      }
      return reply.status(500).send({ message: 'Transaction failed. Internal Server Error' });
    }
  }
};