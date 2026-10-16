import { FastifyRequest, FastifyReply } from 'fastify';

// Garante que existe um token válido — bloqueia acesso anônimo
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: 'Unauthorized' });
  }
}

// Deve rodar SEMPRE depois de authenticate no preHandler
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(403).send({ message: 'Forbidden: admin access required' });
  }
}