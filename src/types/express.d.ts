import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: Role;
      permissions: string[];
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
