import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// 1. Instancia a Factory de Adaptador passando a configuração do arquivo de banco local
const adapter = new PrismaLibSql({
  url: 'file:./src/database/database.db',
});

// 2. Passa a Factory diretamente para o construtor do PrismaClient.
export const prisma = new PrismaClient({ adapter });