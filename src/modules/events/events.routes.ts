import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { eventsController } from './events.controller';
import {
  createEventSchema,
  generateCheckInTokenSchema,
  generateRegistrationTokenSchema,
  idParamSchema,
  toggleRegistrationSchema,
  togglePublicCheckInSchema,
  updateEventSchema,
} from './events.validation';

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
router.post(
  '/:id/registration-token',
  authorize(Permissions.MANAGE_EVENT_ATTENDANCE),
  validate(generateRegistrationTokenSchema),
  (req, res, next) => eventsController.generateRegistrationToken(req, res, next)
);
router.post('/:id/check-in-token', authorize(Permissions.MANAGE_EVENT_ATTENDANCE), validate(generateCheckInTokenSchema), (req, res, next) =>
  eventsController.generateCheckInToken(req, res, next)
);
router.patch(
  '/:id/registration',
  authorize(Permissions.MANAGE_EVENT_ATTENDANCE),
  validate(toggleRegistrationSchema),
  (req, res, next) => eventsController.setRegistrationAccess(req, res, next)
);
router.patch(
  '/:id/public-check-in',
  authorize(Permissions.MANAGE_EVENT_ATTENDANCE),
  validate(togglePublicCheckInSchema),
  (req, res, next) => eventsController.setPublicCheckIn(req, res, next)
);
router.patch('/:id/qr-check-in', authorize(Permissions.MANAGE_EVENT_ATTENDANCE), validate(togglePublicCheckInSchema), (req, res, next) =>
  eventsController.setQrCheckIn(req, res, next)
);

export default router;
