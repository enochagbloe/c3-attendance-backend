import { Router } from 'express';
import { z } from 'zod';
import { usersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Role } from '@prisma/client';
import { sendError } from '../../utils/apiResponse';

const router = Router();

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(Role),
    permissions: z.array(z.string()).optional(),
  }),
});

// Only SUPER_ADMIN can create users for now
router.use(authenticate);
router.post('/', validate(createUserSchema), (req, res, next) => {
  if (req.user?.role !== Role.SUPER_ADMIN) {
    return sendError({ res, message: 'Forbidden', statusCode: 403, code: 'FORBIDDEN' });
  }
  return usersController.create(req, res, next);
});

export default router;
