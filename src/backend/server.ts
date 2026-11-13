import fastify, { FastifyError } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { prisma } from './config/database.js';
import { authRoutes } from './routes/auth-routes.js';
import { cartRoutes } from './routes/cart-routes.js';
import { productRoutes } from './routes/product-routes.js';
import { storefrontRoutes } from './routes/storefront-routes.js';
import { AppError } from './utils/app-error.js';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import path from 'path';
import { fileURLToPath } from 'url';
import { categoryRoutes } from './routes/category-routes.js';

const server = fastify({
  logger: true
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
if (!process.env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET is not defined in environment variables');
}

server.register(fastifyFormbody);
server.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
});

server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
  sign: { expiresIn: '2h' },
  cookie: {
    cookieName: 'token',
    signed: true,
  },
});
// Bloqueia qualquer acesso direto não autenticado ou de clientes normais às páginas administrativas
server.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/pages/admin')) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'ADMIN') {
        return reply.redirect('/pages/vitrine/index.html');
      }
    } catch {
      return reply.redirect('/pages/login/login.html');
    }
  }
});
server.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'frontend'),
  prefix: '/',
});

server.register(authRoutes, { prefix: '/api' });
server.register(cartRoutes, { prefix: '/api' });
server.register(productRoutes, { prefix: '/api' });
server.register(storefrontRoutes, { prefix: '/api' });
server.register(categoryRoutes, { prefix: '/api' });



// Centraliza todo tratamento de erro — controllers não precisam mais de try/catch
server.setErrorHandler((error: FastifyError, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  if (error.validation) {
    return reply.status(400).send({ message: 'Invalid request data', details: error.validation });
  }

  // Respeita o status de erros de cliente (4xx) gerados pelo Fastify (ex: JSON body vazio, rota não encontrada, etc.)
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  request.log.error(error);
  return reply.status(500).send({ message: 'Internal Server Error' });
});

server.get('/api/health', async (request, reply) => {
  await prisma.$queryRaw`SELECT 1`;
  return reply.status(200).send({ status: 'OK', database: 'CONNECTED' });
});

server.ready(() => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(server.printRoutes());
  }
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server executing safely on port ${port}`);
  } catch (err) {
    server.log.error(err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }
};

start();