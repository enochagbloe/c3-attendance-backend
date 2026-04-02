import { Router } from 'express';
import { z } from 'zod';
import { inventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { InventoryAction } from '@prisma/client';

const router = Router();

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    quantity: z.number().int().nonnegative().optional(),
    reorderLevel: z.number().int().nonnegative().optional(),
    condition: z.string().optional(),
    location: z.string().optional(),
  }),
});

const adjustSchema = z.object({
  body: z.object({
    action: z.nativeEnum(InventoryAction),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

router.use(authenticate);

router.post('/', authorize(Permissions.MANAGE_INVENTORY), validate(createSchema), (req, res, next) =>
  inventoryController.create(req, res, next)
);
router.get('/', authorize(Permissions.VIEW_INVENTORY), (req, res, next) => inventoryController.list(req, res, next));
router.patch('/:id/quantity', authorize(Permissions.MANAGE_INVENTORY), validate(adjustSchema), (req, res, next) =>
  inventoryController.adjust(req, res, next)
);
router.get('/low-stock', authorize(Permissions.VIEW_INVENTORY), (req, res, next) =>
  inventoryController.lowStock(req, res, next)
);

export default router;
