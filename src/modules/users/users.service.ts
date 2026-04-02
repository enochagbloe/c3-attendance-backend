import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { Role } from '@prisma/client';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  permissions?: string[];
}

class UsersService {
  async createUser(data: CreateUserInput) {
    const hashed = await bcrypt.hash(data.password, 10);
    try {
      return await prisma.user.create({
        data: { ...data, password: hashed, permissions: data.permissions || [] },
        select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
      }
      throw err;
    }
  }
}

export const usersService = new UsersService();
