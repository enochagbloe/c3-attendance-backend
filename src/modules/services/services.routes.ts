import { Router } from 'express';
import { z } from 'zod';
import { servicesController } from './services.controller';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { ServiceType } from '@prisma/client';

const router = Router();

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    type: z.nativeEnum(ServiceType),
    date: z.string().datetime(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
});

const idSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

router.use(authenticate);
router.post('/', authorize(Permissions.MANAGE_SERVICES), validate(createSchema), (req, res, next) =>
  servicesController.create(req, res, next)
);
router.get('/', authorize(Permissions.VIEW_SERVICES), (req, res, next) => servicesController.list(req, res, next));
router.get('/:id', authorize(Permissions.VIEW_SERVICES), validate(idSchema), (req, res, next) =>
  servicesController.getById(req, res, next)
);

export default router;
