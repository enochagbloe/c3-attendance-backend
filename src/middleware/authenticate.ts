import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../utils/apiResponse';
import { Role } from '@prisma/client';
import { PermissionKey, rolePermissions } from '../modules/auth/permissions';

interface TokenPayload {
  userId: string;
  role: Role;
  permissions?: PermissionKey[];
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError({ res, message: 'Unauthorized', statusCode: 401, code: 'UNAUTHORIZED' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const mergedPermissions = Array.from(
      new Set([...(decoded.permissions || []), ...(rolePermissions[decoded.role] || [])])
    );

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      permissions: mergedPermissions,
    };
    return next();
  } catch (err) {
    return sendError({ res, message: 'Invalid or expired token', statusCode: 401, code: 'TOKEN_INVALID' });
  }
}

export function authorize(required: PermissionKey | PermissionKey[]) {
  const needed = Array.isArray(required) ? required : [required];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError({ res, message: 'Unauthorized', statusCode: 401, code: 'UNAUTHORIZED' });
    }

    const userPerms = new Set(req.user.permissions);
    const hasAll = needed.every((perm) => userPerms.has(perm) || req.user?.role === Role.SUPER_ADMIN);

    if (!hasAll) {
      return sendError({ res, message: 'Forbidden', statusCode: 403, code: 'FORBIDDEN' });
    }

    return next();
  };
}
