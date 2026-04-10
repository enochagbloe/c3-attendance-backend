import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { eventAttendanceController } from './event-attendance.controller';
import {
  attendanceListQuerySchema,
  attendanceSummaryQuerySchema,
  attendanceTimelineQuerySchema,
  checkInSchema,
  registrationListQuerySchema,
  registerForEventSchema,
} from './event-attendance.validation';

const router = Router();

router.post('/:id/register', validate(registerForEventSchema), (req, res, next) =>
  eventAttendanceController.register(req, res, next)
);

router.get(
  '/:id/registrations',
  authenticate,
  authorize([Permissions.VIEW_REGISTRATIONS, Permissions.VIEW_ATTENDANCE]),
  validate(registrationListQuerySchema),
  (req, res, next) => eventAttendanceController.listRegistrations(req, res, next)
);

router.post(
  '/:id/check-in',
  authenticate,
  authorize(Permissions.CHECKIN_ATTENDEES),
  validate(checkInSchema),
  (req, res, next) => eventAttendanceController.checkIn(req, res, next)
);

router.get(
  '/:id/attendance',
  authenticate,
  authorize(Permissions.VIEW_ATTENDANCE),
  validate(attendanceListQuerySchema),
  (req, res, next) => eventAttendanceController.listAttendance(req, res, next)
);

router.get(
  '/:id/attendance/summary',
  authenticate,
  authorize(Permissions.VIEW_ATTENDANCE),
  validate(attendanceSummaryQuerySchema),
  (req, res, next) => eventAttendanceController.summary(req, res, next)
);

router.get(
  '/:id/attendance/timeline',
  authenticate,
  authorize(Permissions.VIEW_ATTENDANCE),
  validate(attendanceTimelineQuerySchema),
  (req, res, next) => eventAttendanceController.timeline(req, res, next)
);

export default router;
