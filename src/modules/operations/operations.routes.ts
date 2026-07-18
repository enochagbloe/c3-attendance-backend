import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { operationsController } from './operations.controller';
import {
  operationsTeamQuerySchema,
  operationsTeamSummarySchema,
} from './operations.validation';

const router = Router();

router.use(authenticate);

router.get(
  '/team',
  authorize(Permissions.VIEW_OPERATIONS_TEAM),
  validate(operationsTeamQuerySchema),
  (req, res, next) => operationsController.listTeam(req, res, next)
);

router.get(
  '/team/summary',
  authorize(Permissions.VIEW_OPERATIONS_TEAM),
  validate(operationsTeamSummarySchema),
  (req, res, next) => operationsController.summary(req, res, next)
);

export default router;
