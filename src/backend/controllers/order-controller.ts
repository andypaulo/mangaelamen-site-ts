import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

// Fluxo linear estrito de estados
const STATUS_TRANSITIONS: Record<string, string> = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

function formatShippingAddress(order: {
  shipToName: string | null;
  shipToCep: string | null;
  shipToStreet: string | null;
  shipToNumber: string | null;
  shipToComplement: string | null;
  shipToNeighborhood: string | null;
  shipToCity: string | null;
  shipToState: string | null;
}) {
  if (!order.shipToName || !order.shipToCep || !order.shipToStreet || !order.shipToNumber || !order.shipToCity || !order.shipToState) {
    return null;
  }

  return {
    recipientName: order.shipToName,
    cep: order.shipToCep,
    street: order.shipToStreet,
    number: order.shipToNumber,
    complement: order.shipToComplement || '',
    neighborhood: order.shipToNeighborhood || '',
    city: order.shipToCity,
    state: order.shipToState,
  };
}

export const orderController = {
  /**
   * GET /api/orders
   * Retorna os pedidos do usuário autenticado (mais recentes primeiro).
   * Valores (preço, subtotal, total) vêm do servidor, baseados em priceAtPurchase.
   * Mangás excluídos (soft delete) continuam aparecendo no include.
   */
  async listUserOrders(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        statusEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
      shippingAddress: formatShippingAddress(order),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Mangá',
        productImage: item.product?.image || 'sem-foto.jpg',
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        subtotal: Number((item.priceAtPurchase * item.quantity).toFixed(2)),
      })),
      timeline: order.statusEvents.map((evt) => ({
        id: evt.id,
        status: evt.status,
        createdAt: evt.createdAt,
      })),
    }));

    return reply.status(200).send(formattedOrders);
  },

  /**
   * GET /api/orders/:id
   * Detalhes de um pedido específico do usuário logado.
   * Se não pertencer ao usuário ou não existir, responde 404 (nunca 403).
   */
  async getUserOrderById(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;
    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        statusEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    return reply.status(200).send({
      id: order.id,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
      shippingAddress: formatShippingAddress(order),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Mangá',
        productImage: item.product?.image || 'sem-foto.jpg',
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        subtotal: Number((item.priceAtPurchase * item.quantity).toFixed(2)),
      })),
      timeline: order.statusEvents.map((evt) => ({
        id: evt.id,
        status: evt.status,
        createdAt: evt.createdAt,
      })),
    });
  },

  /**
   * GET /api/admin/orders
   * Lista todos os pedidos do sistema para o painel administrativo.
   */
  async listAllOrdersAdmin(request: FastifyRequest, reply: FastifyReply) {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        statusEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
      customer: {
        id: order.user?.id || order.userId,
        name: order.user?.name || 'Cliente',
        email: order.user?.email || '',
      },
      itemsCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
      timeline: order.statusEvents.map((evt) => ({
        id: evt.id,
        status: evt.status,
        createdAt: evt.createdAt,
      })),
    }));

    return reply.status(200).send(formattedOrders);
  },

  /**
   * PATCH /api/admin/orders/:id/status
   * Atualização atômica e condicional do status do pedido.
   * Valida transição estrita para o próximo estado.
   * Executa dentro de transação com updateMany condicional.
   */
  async updateOrderStatusAdmin(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status: targetStatus } = (request.body as { status?: string }) || {};

    if (!targetStatus) {
      throw new AppError('O novo status é obrigatório', 400);
    }

    const currentOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!currentOrder) {
      throw new AppError('Pedido não encontrado', 404);
    }

    const expectedNextStatus = STATUS_TRANSITIONS[currentOrder.status];
    if (!expectedNextStatus || expectedNextStatus !== targetStatus) {
      throw new AppError(
        `Transição de status inválida: não é permitido alterar de '${currentOrder.status}' para '${targetStatus}'.`,
        400
      );
    }

    // Atualização atômica e condicional ao estado atual esperado
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: {
          id,
          status: currentOrder.status,
        },
        data: {
          status: targetStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new AppError(
          'O status do pedido já foi alterado concorrentemente ou a transição não é mais válida.',
          409
        );
      }

      const event = await tx.orderStatusEvent.create({
        data: {
          orderId: id,
          status: targetStatus,
        },
      });

      return { id, status: targetStatus, event };
    });

    return reply.status(200).send({
      message: 'Status do pedido atualizado com sucesso',
      order: updatedOrder,
    });
  },
};
