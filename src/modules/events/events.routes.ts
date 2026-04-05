import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { eventsController } from './events.controller';
import { createEventSchema, idParamSchema, updateEventSchema } from './events.validation';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Permissions.VIEW_EVENTS), (req, res, next) => eventsController.list(req, res, next));
router.post('/', authorize(Permissions.MANAGE_EVENTS), validate(createEventSchema), (req, res, next) =>
  eventsController.create(req, res, next)
);
router.get('/:id', authorize(Permissions.VIEW_EVENTS), validate(idParamSchema), (req, res, next) =>
  eventsController.getById(req, res, next)
);
router.patch('/:id', authorize(Permissions.MANAGE_EVENTS), validate(updateEventSchema), (req, res, next) =>
  eventsController.update(req, res, next)
);
router.delete('/:id', authorize(Permissions.MANAGE_EVENTS), validate(idParamSchema), (req, res, next) =>
  eventsController.delete(req, res, next)
);
router.patch('/:id/cancel', authorize(Permissions.MANAGE_EVENTS), validate(idParamSchema), (req, res, next) =>
  eventsController.cancel(req, res, next)
);
router.patch('/:id/archive', authorize(Permissions.MANAGE_EVENTS), validate(idParamSchema), (req, res, next) =>
  eventsController.archive(req, res, next)
);
router.patch('/:id/restore', authorize(Permissions.MANAGE_EVENTS), validate(idParamSchema), (req, res, next) =>
  eventsController.restore(req, res, next)
);

export default router;
