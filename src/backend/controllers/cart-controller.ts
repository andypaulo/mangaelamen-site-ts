import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

interface CartInputBody {
  productId?: number | string;
  produtoId?: number | string;
  id?: number | string;
  quantity?: number | string;
  novaQuantidade?: number | string;
  quantidade?: number | string;
}

function parseProductId(body: CartInputBody, paramsId?: string): number {
  const rawId = paramsId ?? body.productId ?? body.produtoId ?? body.id;
  const parsed = Number(rawId);
  if (!rawId || isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Product ID is required and must be a positive integer', 400);
  }
  return parsed;
}

function parseQuantity(body: CartInputBody, defaultVal = 1): number {
  const raw = body.quantity ?? body.novaQuantidade ?? body.quantidade ?? defaultVal;
  const parsed = Number(raw);
  if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new AppError('Quantidade mínima é 1.', 400);
  }
  return parsed;
}

export const cartController = {
  async addItem(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;
    const body = (request.body as CartInputBody) || {};
    const productId = parseProductId(body);
    const reqQuantity = parseQuantity(body, 1);

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product || product.deletedAt) {
      throw new AppError('Produto não encontrado ou indisponível.', 404);
    }

    if (product.stock <= 0) {
      throw new AppError(`O mangá '${product.name}' está esgotado e não pode ser adicionado ao carrinho.`, 400);
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
      if (newQuantity > product.stock) {
        throw new AppError(
          `Você já possui a quantidade máxima disponível em estoque no seu carrinho (${product.stock} un).`,
          400
        );
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      if (reqQuantity > product.stock) {
        throw new AppError(`Estoque insuficiente para o produto: ${product.name}`, 400);
      }
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity: reqQuantity }
      });
    }

    // Calcula o total do carrinho atualizado
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } }
    });

    const validItems = (updatedCart?.items || []).filter(
      (item) => item.product && !item.product.deletedAt
    );
    const totalPrice = validItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    return reply.status(200).send({
      message: 'Item adicionado ao carrinho com sucesso',
      total: Number(totalPrice.toFixed(2))
    });
  },

  async getCart(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return reply.status(200).send({ items: [], totalPrice: 0 });
    }

    // Identifica e limpa itens cujo produto foi excluído (soft-delete ou inexistente)
    const invalidItemIds: string[] = [];
    const validItems: typeof cart.items = [];

    for (const item of cart.items) {
      if (!item.product || item.product.deletedAt !== null) {
        invalidItemIds.push(item.id);
      } else {
        validItems.push(item);
      }
    }

    if (invalidItemIds.length > 0) {
      await prisma.cartItem.deleteMany({
        where: { id: { in: invalidItemIds } }
      });
    }

    const formattedItems = validItems.map((item) => {
      const subtotal = Number((item.product.price * item.quantity).toFixed(2));
      return {
        id: item.id,
        produtoId: item.product.id,
        nome: item.product.name,
        imagem: item.product.image,
        categoria: item.product.category?.name || 'Geral',
        preco: item.product.price,
        quantidade: item.quantity,
        estoque: item.product.stock,
        subtotal
      };
    });

    const totalPrice = formattedItems.reduce((acc, item) => acc + item.subtotal, 0);

    return reply.status(200).send({
      items: formattedItems,
      totalPrice: Number(totalPrice.toFixed(2)),
      total: Number(totalPrice.toFixed(2))
    });
  },

  async updateItemQuantity(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;
    const params = (request.params as { id?: string }) || {};
    const body = (request.body as CartInputBody) || {};

    const quantity = parseQuantity(body, 1);

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart) {
      throw new AppError('Carrinho não encontrado.', 404);
    }

    // O identificador pode ser o id do cartItem ou o productId
    let item = cart.items.find((i) => i.id === params.id);
    if (!item) {
      const pId = Number(params.id || body.productId || body.produtoId || body.id);
      if (pId && !isNaN(pId)) {
        item = cart.items.find((i) => i.productId === pId);
      }
    }

    if (!item) {
      throw new AppError('Item não encontrado no carrinho.', 404);
    }

    if (!item.product || item.product.deletedAt !== null) {
      await prisma.cartItem.delete({ where: { id: item.id } });
      throw new AppError('Este produto não está mais disponível.', 400);
    }

    if (item.product.stock <= 0) {
      throw new AppError('Este produto acabou de esgotar no estoque.', 400);
    }

    if (quantity > item.product.stock) {
      throw new AppError(`Estoque insuficiente. Disponível: ${item.product.stock}.`, 400);
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity }
    });

    // Recalcula o total do carrinho no servidor
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } }
    });

    const validItems = (updatedCart?.items || []).filter(
      (i) => i.product && !i.product.deletedAt
    );
    const totalPrice = validItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

    return reply.status(200).send({
      message: 'Quantidade atualizada com sucesso',
      total: Number(totalPrice.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2))
    });
  },

  async removeItem(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;
    const params = (request.params as { id?: string }) || {};
    const body = (request.body as CartInputBody) || {};

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!cart) {
      throw new AppError('Carrinho não encontrado.', 404);
    }

    // Localiza o item pelo cartItem.id ou pelo productId
    let item = cart.items.find((i) => i.id === params.id);
    if (!item) {
      const pId = Number(params.id || body.productId || body.produtoId || body.id);
      if (pId && !isNaN(pId)) {
        item = cart.items.find((i) => i.productId === pId);
      }
    }

    if (!item) {
      throw new AppError('Item não encontrado no carrinho.', 404);
    }

    await prisma.cartItem.delete({
      where: { id: item.id }
    });

    // Recalcula o total do carrinho no servidor
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } }
    });

    const validItems = (updatedCart?.items || []).filter(
      (i) => i.product && !i.product.deletedAt
    );
    const totalPrice = validItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

    return reply.status(200).send({
      message: 'Item removido do carrinho com sucesso',
      total: Number(totalPrice.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2))
    });
  },

  async checkout(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Seu carrinho está vazio.', 400);
    }

    const order = await prisma.$transaction(async (tx) => {
      let totalOrderPrice = 0;
      const orderItemsData = [];

      for (const item of cart.items) {
        // Validação no servidor: produto existente e não excluído (soft delete)
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!currentProduct || currentProduct.deletedAt !== null) {
          throw new AppError(
            `O produto '${item.product?.name || 'solicitado'}' não está mais disponível para compra.`,
            400
          );
        }

        if (currentProduct.stock < item.quantity) {
          throw new AppError(
            `Estoque insuficiente para o item: ${currentProduct.name}. Disponível: ${currentProduct.stock}`,
            400
          );
        }

        // Abate o estoque do produto
        await tx.product.update({
          where: { id: currentProduct.id },
          data: { stock: currentProduct.stock - item.quantity }
        });

        const itemSubtotal = currentProduct.price * item.quantity;
        totalOrderPrice += itemSubtotal;

        orderItemsData.push({
          productId: currentProduct.id,
          quantity: item.quantity,
          priceAtPurchase: currentProduct.price
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          totalPrice: Number(totalOrderPrice.toFixed(2)),
          status: 'PAID',
          items: { createMany: { data: orderItemsData } }
        },
        include: { items: true }
      });

      // Limpa todos os itens do carrinho após a compra
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    return reply.status(201).send({
      message: 'Compra efetuada com sucesso!',
      mensagem: 'Compra efetuada com sucesso!',
      order
    });
  }
};
