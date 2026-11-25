import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const MAX_ADDRESSES_PER_USER = 5;

const FIELD_LIMITS = {
  label: 30,
  recipientName: 80,
  street: 120,
  number: 20,
  complement: 60,
  neighborhood: 80,
  city: 80,
};

// Serializa mutações por usuário para evitar condições de corrida no SQLite
const userLocks = new Map<string, Promise<void>>();

async function withUserAddressLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = userLocks.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  userLocks.set(userId, chained);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (userLocks.get(userId) === chained) {
      userLocks.delete(userId);
    }
  }
}

async function getAuthenticatedUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new AppError('Unauthorized', 401);
  }

  return user;
}

interface AddressInput {
  label?: unknown;
  recipientName?: unknown;
  cep?: unknown;
  street?: unknown;
  number?: unknown;
  complement?: unknown;
  neighborhood?: unknown;
  city?: unknown;
  state?: unknown;
}

interface ValidatedAddress {
  label: string;
  recipientName: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

function validateAddressBody(raw: unknown): {
  data?: ValidatedAddress;
  errors?: Record<string, string>;
} {
  const body = (raw && typeof raw === 'object' ? raw : {}) as AddressInput;
  const errors: Record<string, string> = {};

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : '';
  const rawCep = typeof body.cep === 'string' ? body.cep.trim() : '';
  const street = typeof body.street === 'string' ? body.street.trim() : '';
  const number = typeof body.number === 'string' ? body.number.trim() : '';
  const complement = typeof body.complement === 'string' ? body.complement.trim() : '';
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const state = typeof body.state === 'string' ? body.state.trim().toUpperCase() : '';

  if (label.length > FIELD_LIMITS.label) {
    errors.label = `O rótulo deve ter no máximo ${FIELD_LIMITS.label} caracteres.`;
  }

  if (!recipientName) {
    errors.recipientName = 'Informe o nome do destinatário.';
  } else if (recipientName.length > FIELD_LIMITS.recipientName) {
    errors.recipientName = `O nome do destinatário deve ter no máximo ${FIELD_LIMITS.recipientName} caracteres.`;
  }

  const normalizedCep = rawCep.replace(/-/g, '');
  if (!rawCep) {
    errors.cep = 'Informe o CEP.';
  } else if (!/^\d{8}$/.test(normalizedCep)) {
    errors.cep = 'CEP inválido. Informe 8 dígitos numéricos (ex.: 01001-000).';
  }

  if (!street) {
    errors.street = 'Informe o logradouro (rua/avenida).';
  } else if (street.length > FIELD_LIMITS.street) {
    errors.street = `O logradouro deve ter no máximo ${FIELD_LIMITS.street} caracteres.`;
  }

  if (!number) {
    errors.number = 'Informe o número (ou "S/N").';
  } else if (number.length > FIELD_LIMITS.number) {
    errors.number = `O número deve ter no máximo ${FIELD_LIMITS.number} caracteres.`;
  }

  if (complement.length > FIELD_LIMITS.complement) {
    errors.complement = `O complemento deve ter no máximo ${FIELD_LIMITS.complement} caracteres.`;
  }

  if (!neighborhood) {
    errors.neighborhood = 'Informe o bairro.';
  } else if (neighborhood.length > FIELD_LIMITS.neighborhood) {
    errors.neighborhood = `O bairro deve ter no máximo ${FIELD_LIMITS.neighborhood} caracteres.`;
  }

  if (!city) {
    errors.city = 'Informe a cidade.';
  } else if (city.length > FIELD_LIMITS.city) {
    errors.city = `A cidade deve ter no máximo ${FIELD_LIMITS.city} caracteres.`;
  }

  if (!state) {
    errors.state = 'Selecione a UF.';
  } else if (!VALID_UFS.has(state)) {
    errors.state = 'UF inválida.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      label,
      recipientName,
      cep: normalizedCep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    },
  };
}

export const addressController = {
  async listAddresses(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return reply.status(200).send(addresses);
  },

  async createAddress(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);
    const { data, errors } = validateAddressBody(request.body);

    if (errors || !data) {
      const firstMessage = Object.values(errors || {})[0] || 'Dados de endereço inválidos.';
      return reply.status(400).send({ message: firstMessage, errors });
    }

    const created = await withUserAddressLock(user.id, () =>
      prisma.$transaction(async (tx) => {
        const count = await tx.address.count({ where: { userId: user.id } });
        if (count >= MAX_ADDRESSES_PER_USER) {
          throw new AppError(`Limite máximo de ${MAX_ADDRESSES_PER_USER} endereços atingido.`, 400);
        }

        const isFirst = count === 0;
        return tx.address.create({
          data: {
            userId: user.id,
            ...data,
            isDefault: isFirst,
          },
        });
      })
    );

    return reply.status(201).send(created);
  },

  async updateAddress(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);
    const { id } = request.params as { id: string };
    const { data, errors } = validateAddressBody(request.body);

    if (errors || !data) {
      const firstMessage = Object.values(errors || {})[0] || 'Dados de endereço inválidos.';
      return reply.status(400).send({ message: firstMessage, errors });
    }

    const updated = await withUserAddressLock(user.id, () =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.address.findFirst({
          where: { id, userId: user.id },
        });

        if (!existing) {
          throw new AppError('Endereço não encontrado.', 404);
        }

        return tx.address.update({
          where: { id: existing.id },
          data,
        });
      })
    );

    return reply.status(200).send(updated);
  },

  async setDefaultAddress(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);
    const { id } = request.params as { id: string };

    const updated = await withUserAddressLock(user.id, () =>
      prisma.$transaction(async (tx) => {
        const target = await tx.address.findFirst({
          where: { id, userId: user.id },
        });

        if (!target) {
          throw new AppError('Endereço não encontrado.', 404);
        }

        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });

        return tx.address.update({
          where: { id: target.id },
          data: { isDefault: true },
        });
      })
    );

    return reply.status(200).send(updated);
  },

  async deleteAddress(request: FastifyRequest, reply: FastifyReply) {
    const user = await getAuthenticatedUser(request.user.id);
    const { id } = request.params as { id: string };

    await withUserAddressLock(user.id, () =>
      prisma.$transaction(async (tx) => {
        const target = await tx.address.findFirst({
          where: { id, userId: user.id },
        });

        if (!target) {
          throw new AppError('Endereço não encontrado.', 404);
        }

        await tx.address.delete({
          where: { id: target.id },
        });

        if (target.isDefault) {
          const newestRemaining = await tx.address.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
          });

          if (newestRemaining) {
            await tx.address.update({
              where: { id: newestRemaining.id },
              data: { isDefault: true },
            });
          }
        }
      })
    );

    return reply.status(200).send({ message: 'Endereço excluído com sucesso.' });
  },
};
