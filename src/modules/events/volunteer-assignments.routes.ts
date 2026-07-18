import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { volunteerAssignmentsController } from './volunteer-assignments.controller';
import {
  createVolunteerAssignmentSchema,
  listVolunteerAssignmentsSchema,
  updateVolunteerAssignmentSchema,
  volunteerAssignmentIdSchema,
  volunteerAssignmentSummarySchema,
} from './volunteer-assignments.validation';

const router = Router();

router.use(authenticate);

router.post(
  '/:eventId/volunteer-assignments',
  authorize(Permissions.MANAGE_EVENT_ASSIGNMENTS),
  validate(createVolunteerAssignmentSchema),
  (req, res, next) => volunteerAssignmentsController.create(req, res, next)
);

router.get(
  '/:eventId/volunteer-assignments',
  authorize(Permissions.VIEW_EVENT_ASSIGNMENTS),
  validate(listVolunteerAssignmentsSchema),
  (req, res, next) => volunteerAssignmentsController.list(req, res, next)
);

router.get(
  '/:eventId/volunteer-assignments/summary',
  authorize(Permissions.VIEW_EVENT_ASSIGNMENTS),
  validate(volunteerAssignmentSummarySchema),
  (req, res, next) => volunteerAssignmentsController.summary(req, res, next)
);

router.get(
  '/:eventId/volunteer-assignments/:assignmentId',
  authorize(Permissions.VIEW_EVENT_ASSIGNMENTS),
  validate(volunteerAssignmentIdSchema),
  (req, res, next) => volunteerAssignmentsController.getById(req, res, next)
);

router.patch(
  '/:eventId/volunteer-assignments/:assignmentId',
  authorize(Permissions.MANAGE_EVENT_ASSIGNMENTS),
  validate(updateVolunteerAssignmentSchema),
  (req, res, next) => volunteerAssignmentsController.update(req, res, next)
);

router.delete(
  '/:eventId/volunteer-assignments/:assignmentId',
  authorize(Permissions.MANAGE_EVENT_ASSIGNMENTS),
  validate(volunteerAssignmentIdSchema),
  (req, res, next) => volunteerAssignmentsController.remove(req, res, next)
);

export default router;
