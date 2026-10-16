import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  // É aqui que a URL do banco mora agora — não existe mais no schema.prisma.
  // O CLI (migrate, studio, db push, etc.) lê a conexão daqui.
  datasource: {
    url: env('DATABASE_URL'),
  },
});