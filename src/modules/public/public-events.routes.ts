import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { createSimpleRateLimit } from '../../middleware/simpleRateLimit';
import { phoneLookupKey } from '../../utils/phone';
import { publicEventsController } from './public-events.controller';
import {
  publicCheckInMetadataSchema,
  publicCheckInSchema,
  publicRegistrationMetadataSchema,
  publicRegistrationSchema,
} from '../events/event-attendance.validation';

const router = Router();

const metadataRateLimit = createSimpleRateLimit({
  windowMs: 60_000,
  maxRequests: 60,
});

const registrationRateLimit = createSimpleRateLimit({
  windowMs: 60_000,
  maxRequests: 20,
  keyGenerator: (req) => {
    const phone = typeof req.body?.phoneNumber === 'string' ? phoneLookupKey(req.body.phoneNumber) : '';
    return `${req.ip ?? 'unknown'}:${phone || 'anonymous'}:registration`;
  },
});

const checkInRateLimit = createSimpleRateLimit({
  windowMs: 60_000,
  maxRequests: 20,
  keyGenerator: (req) => {
    const phone = typeof req.body?.phoneNumber === 'string' ? phoneLookupKey(req.body.phoneNumber) : '';
    return `${req.ip ?? 'unknown'}:${phone || 'anonymous'}`;
  },
});

router.get('/events/register/:token', metadataRateLimit, validate(publicRegistrationMetadataSchema), (req, res, next) =>
  publicEventsController.getRegistrationMetadata(req, res, next)
);

router.post('/events/register/:token', registrationRateLimit, validate(publicRegistrationSchema), (req, res, next) =>
  publicEventsController.register(req, res, next)
);

router.get('/events/check-in/:token', metadataRateLimit, validate(publicCheckInMetadataSchema), (req, res, next) =>
  publicEventsController.getCheckInMetadata(req, res, next)
);

router.post('/events/check-in/:token', checkInRateLimit, validate(publicCheckInSchema), (req, res, next) =>
  publicEventsController.selfCheckIn(req, res, next)
);

export default router;
