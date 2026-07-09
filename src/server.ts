import fastify from 'fastify';
import { prisma } from './config/database.js';

const server = fastify({
  logger: true 
});

server.get('/health', async (request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return reply.status(200).send({ status: 'OK', database: 'CONNECTED' });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ status: 'ERROR', message: 'Database failure' });
  }
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server executing safely on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();