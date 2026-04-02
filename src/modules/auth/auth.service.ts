import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';
import { rolePermissions } from './permissions';
import { Role } from '@prisma/client';

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  signupKey?: string;
}

export interface AuthTokenPayload {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    permissions: string[];
  };
}

export class AuthService {
  async login({ email, password }: LoginInput): Promise<AuthTokenPayload> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const permissions = Array.from(new Set([...(user.permissions || []), ...(rolePermissions[user.role] || [])]));

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        permissions,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    };
  }

  async signup({ name, email, password, role, signupKey }: SignupInput): Promise<AuthTokenPayload> {
    const userCount = await prisma.user.count();

    // After first user, require signupKey to prevent public signups
    if (userCount > 0) {
      // eslint-disable-next-line no-console
      console.log('signupKey provided vs expected', signupKey, env.signupKey);
      if (!env.signupKey || signupKey !== env.signupKey) {
        throw new AppError('Invalid signup key', 403, 'SIGNUP_KEY_INVALID');
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashed,
          role: userCount === 0 ? Role.SUPER_ADMIN : role ?? Role.CHURCH_ADMIN,
          permissions: [],
        },
      });
    } catch (err: unknown) {
      // handle unique email violation
      // Prisma v5 error codes: P2002 = unique constraint
      // fall back to generic error
      if ((err as { code?: string }).code === 'P2002') {
        throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
      }
      throw err;
    }

    const permissions = Array.from(new Set([...(newUser.permissions || []), ...(rolePermissions[newUser.role] || [])]));

    const token = jwt.sign(
      {
        userId: newUser.id,
        role: newUser.role,
        permissions,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions,
      },
    };
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Do not reveal whether user exists
    if (!user) {
      return { message: 'If that email exists, a reset link will be sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // In production, send via email/SMS. For now, return token for manual testing.
    return { resetToken: token, expiresAt };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({ where: { token }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Password reset successful' };
  }
}

export const authService = new AuthService();
