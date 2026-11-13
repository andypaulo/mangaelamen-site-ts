import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./prisma/database.db',
});

const basePrisma = new PrismaClient({ adapter });

export const prisma = basePrisma.$extends({
  query: {
    product: {
      async findUnique({ args, query }) {
        const result = (await query(args)) as any;
        if (result && result.deletedAt !== null && result.deletedAt !== undefined) {
          return null;
        }
        return result;
      },
      async findUniqueOrThrow({ args, query }) {
        const result = (await query(args)) as any;
        if (result && result.deletedAt !== null && result.deletedAt !== undefined) {
          throw new Prisma.PrismaClientKnownRequestError(
            'An operation failed because it depends on one or more records that were required but not found.',
            { code: 'P2025', clientVersion: '7.8.0' }
          );
        }
        return result;
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirstOrThrow({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async aggregate({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async groupBy({ args, query }) {
        const anyArgs = args as any;
        anyArgs.where = { ...anyArgs.where, deletedAt: null };
        return query(anyArgs);
      },
    },
  },
});

export { Prisma };
