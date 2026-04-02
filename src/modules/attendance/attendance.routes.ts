import { Router } from 'express';
import { z } from 'zod';
import { attendanceController } from './attendance.controller';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';

const router = Router();

const checkInSchema = z.object({
  body: z.object({
    memberId: z.string().uuid(),
    serviceId: z.string().uuid(),
  }),
});

const dateRangeSchema = z.object({
  query: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

const closeServiceSchema = z.object({
  body: z.object({
    serviceId: z.string().uuid(),
  }),
});

router.use(authenticate);
router.post('/check-in', authorize(Permissions.CHECKIN_MEMBERS), validate(checkInSchema), (req, res, next) =>
  attendanceController.checkIn(req, res, next)
);
router.get('/today', authorize(Permissions.VIEW_ATTENDANCE), (req, res, next) => attendanceController.today(req, res, next));
router.get('/range', authorize(Permissions.VIEW_ATTENDANCE), validate(dateRangeSchema), (req, res, next) =>
  attendanceController.byRange(req, res, next)
);
router.post('/close-service', authorize(Permissions.MANAGE_SERVICES), validate(closeServiceSchema), (req, res, next) =>
  attendanceController.closeService(req, res, next)
);

export default router;
