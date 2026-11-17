import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';
import { passwordRateLimiter } from '../utils/password-rate-limit.js';

// Regex para validação de formato de e-mail
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getAuthenticatedUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      createdAt: true,
      deletedAt: true
    }
  });

  if (!user || user.deletedAt) {
    throw new AppError('Unauthorized', 401);
  }

  return user;
}

export const profileController = {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);

    return reply.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  },

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);
    const body = (request.body || {}) as {
      name?: string;
      email?: string;
      currentPassword?: string;
    };

    const hasName = typeof body.name === 'string';
    const hasEmail = typeof body.email === 'string';

    if (!hasName && !hasEmail) {
      throw new AppError('Nenhum dado informado para atualização', 400);
    }

    const updateData: { name?: string; email?: string } = {};

    // 1. Validação de Nome
    if (hasName) {
      const trimmedName = body.name!.trim();
      if (!trimmedName || trimmedName.length < 2) {
        throw new AppError('O nome deve ter pelo menos 2 caracteres', 400);
      }
      updateData.name = trimmedName;
    }

    // 2. Validação de E-mail
    if (hasEmail) {
      // Aplica SOMENTE trim() sem toLowerCase (alinhado com o registro e login)
      const trimmedEmail = body.email!.trim();

      if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
        throw new AppError('Formato de e-mail inválido', 400);
      }

      // Se o e-mail for diferente do atual, exige a senha atual e validação de rate limit
      if (trimmedEmail !== user.email) {
        if (!body.currentPassword) {
          throw new AppError('A senha atual é obrigatória para alterar o e-mail', 400);
        }

        passwordRateLimiter.check(user.id);

        const isPasswordValid = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!isPasswordValid) {
          passwordRateLimiter.recordFailure(user.id);
          throw new AppError('Senha atual incorreta', 400);
        }

        // Senha correta: zera o contador
        passwordRateLimiter.recordSuccess(user.id);

        // Checagem exata de duplicidade (como no registro)
        const emailExists = await prisma.user.findFirst({
          where: {
            email: trimmedEmail,
            NOT: { id: user.id }
          }
        });

        if (emailExists) {
          throw new AppError('E-mail já cadastrado por outra conta', 409);
        }

        updateData.email = trimmedEmail;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return reply.status(200).send(updatedUser);
  },

  async updatePassword(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);
    const { currentPassword, newPassword } = (request.body || {}) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      throw new AppError('Senha atual e nova senha são obrigatórias', 400);
    }

    passwordRateLimiter.check(user.id);

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      passwordRateLimiter.recordFailure(user.id);
      throw new AppError('Senha atual incorreta', 400);
    }

    // Senha correta: zera o contador
    passwordRateLimiter.recordSuccess(user.id);

    // Validações da nova senha
    if (newPassword.length < 6 || newPassword.length > 72) {
      throw new AppError('A nova senha deve ter entre 6 e 72 caracteres', 400);
    }

    if (newPassword === currentPassword) {
      throw new AppError('A nova senha deve ser diferente da senha atual', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    // Opção 1: Limpa o cookie de sessão para exigir login com a nova senha
    reply.clearCookie('token', { path: '/' });

    return reply.status(200).send({
      message: 'Senha alterada com sucesso! Faça login com a nova senha.'
    });
  },

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);

    // Busca todos os pedidos do usuário, ordenados por mais recente primeiro
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        statusEvents: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);
    const lastOrderDate = orders[0] ? orders[0].createdAt : null;

    // Pedido em andamento: o mais recente cujo status NÃO seja 'DELIVERED'
    const activeOrderRecord = orders.find(o => o.status !== 'DELIVERED');

    let activeOrder = null;
    if (activeOrderRecord) {
      const cleanId = activeOrderRecord.id.replace(/-/g, '');
      const shortId = '#' + cleanId.substring(0, 8).toUpperCase();
      const itemsCount = activeOrderRecord.items.reduce((acc, item) => acc + item.quantity, 0);

      activeOrder = {
        id: activeOrderRecord.id,
        shortId,
        totalPrice: activeOrderRecord.totalPrice,
        status: activeOrderRecord.status,
        createdAt: activeOrderRecord.createdAt,
        itemsCount,
        timeline: activeOrderRecord.statusEvents.map(ev => ({
          status: ev.status,
          createdAt: ev.createdAt
        }))
      };
    }

    return reply.status(200).send({
      totalOrders,
      totalSpent: Number(totalSpent.toFixed(2)),
      lastOrderDate,
      activeOrder
    });
  }
};
