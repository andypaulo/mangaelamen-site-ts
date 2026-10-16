import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/app-error.js';

const isProduction = process.env.NODE_ENV === 'production';

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const { name, email, password } = request.body as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !email || !password) {
      throw new AppError('Missing required fields', 400);
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      throw new AppError('Email already registered', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, role: 'CUSTOMER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    return reply.status(201).send(newUser);
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = await reply.jwtSign({ id: user.id, role: user.role });

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      signed: true,
      maxAge: 60 * 60 * 2,
    });

    return reply.status(200).send({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  },
  async logout(request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie('token', { path: '/' });
    return reply.status(200).send({ message: 'Logout successful' });
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    return reply.status(200).send(user);
  }
};