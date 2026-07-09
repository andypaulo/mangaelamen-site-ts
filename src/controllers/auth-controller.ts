import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';

export const authController = {
  // 1. Fluxo de Registro de Novo Usuário
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, email, password, role } = request.body as any;

      // Validação básica de campos obrigatórios
      if (!name || !email || !password) {
        return reply.status(400).send({ message: 'Missing required fields' });
      }

      // Validação de regras de negócio (Garante que o e-mail é único)
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        return reply.status(409).send({ message: 'Email already registered' });
      }

      // Segurança: Geração do Hash da Senha (fator de custo 10)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Definição do papel padrão caso não seja enviado
      const userRole = role || 'CUSTOMER';

      // Persistência no banco (O Prisma converte automaticamente camelCase para snake_case)
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: userRole,
        },
        select: { // Segurança: Nunca retorne o passwordHash para o cliente
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        }
      });

      return reply.status(201).send(newUser);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  },

  // 2. Fluxo de Autenticação (Login)
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = request.body as any;

      if (!email || !password) {
        return reply.status(400).send({ message: 'Email and password are required' });
      }

      // Busca o usuário incluindo o password_hash interno
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.deletedAt) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      // Segurança: Compara o hash guardado com a senha digitada
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      // Por enquanto: retornamos os dados confirmando o login de sucesso.
      // Futuramente: Token JWT.
      return reply.status(200).send({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  }
};