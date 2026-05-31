import { Router } from 'express';
import { z } from 'zod';
import { membersController } from './members.controller';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { Permissions } from '../auth/permissions';
import { MemberStatus } from '@prisma/client';

const router = Router();

const isoDateInput = z.preprocess(
  (value) => {
    if (value === '' || value === null) {
      return undefined;
    }
    return value;
  },
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO date')
);

const baseMember = {
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  gender: z.string().optional(),
  primaryMembershipStatus: z.nativeEnum(MemberStatus),
  dateOfBirth: isoDateInput.optional(),
  joinedAt: isoDateInput.optional(),
  baptizedHere: z.boolean().optional(),
  maritalStatus: z.string().min(1),
  area: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  landmarkOrAddressLine: z.string().optional(),
  occupation: z.string().optional(),
  workplaceName: z.string().optional(),
  hasFamilyMemberAtChurch: z.boolean().optional(),
  familyMemberName: z.string().optional(),
  familyMemberPhone: z.string().optional(),
  familyRelationship: z.string().optional(),
  volunteerRecords: z
    .array(
      z.object({
        volunteerRoleId: z.string().uuid(),
        departmentId: z.string().uuid().optional().nullable(),
        ministryName: z.string().optional(),
        startDate: isoDateInput,
        endDate: isoDateInput.optional(),
      })
    )
    .optional(),
  leadershipRecords: z
    .array(
      z.object({
        leadershipRoleId: z.string().uuid(),
        startDate: isoDateInput,
        endDate: isoDateInput.optional(),
      })
    )
    .optional(),
  fellowshipIds: z.array(z.string().uuid()).optional(),
  membershipStatuses: z
    .array(
      z.object({
        status: z.nativeEnum(MemberStatus),
        effectiveDate: isoDateInput,
        endDate: isoDateInput.optional(),
      })
    )
    .optional(),
};

const createSchema = z.object({ body: z.object(baseMember) });
const updateSchema = z.object({
  body: z.object(baseMember).partial(),
  params: z.object({ id: z.string().uuid() }),
});

const idParamSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
const listQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^[0-9]+$/).optional(),
    limit: z.string().regex(/^[0-9]+$/).optional(),
    includeDeleted: z.enum(['true', 'false']).optional(),
  }),
});

const selfUpdateLinkSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    expiresInMinutes: z.number().int().positive().max(60 * 24).optional(), // up to 24h
  }),
});

const inviteLinkSchema = z.object({
  body: z.object({
    expiresInMinutes: z.number().int().positive().max(60 * 24 * 7).optional(), // up to 7 days
  }),
});

const selfRegisterSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    ...baseMember,
    primaryMembershipStatus: z.nativeEnum(MemberStatus).optional(),
    maritalStatus: z.string().min(1), // still required
  }),
});

// Public invite-based registration must stay open so members can use the shared link without a bearer token.
router.post('/self-register', validate(selfRegisterSchema), (req, res, next) =>
  membersController.selfRegister(req, res, next)
);

router.use(authenticate);

router.get('/', authorize(Permissions.VIEW_MEMBERS), validate(listQuerySchema), (req, res, next) =>
  membersController.list(req, res, next)
);
router.post('/', authorize([Permissions.CREATE_MEMBERS]), validate(createSchema), (req, res, next) =>
  membersController.create(req, res, next)
);
router.get('/:id', authorize(Permissions.VIEW_MEMBERS), validate(idParamSchema), (req, res, next) =>
  membersController.getById(req, res, next)
);
router.patch('/:id', authorize([Permissions.UPDATE_MEMBERS]), validate(updateSchema), (req, res, next) =>
  membersController.update(req, res, next)
);
router.put('/:id', authorize([Permissions.UPDATE_MEMBERS]), validate(updateSchema), (req, res, next) =>
  membersController.update(req, res, next)
);
router.delete('/:id', authorize([Permissions.DELETE_MEMBERS]), validate(idParamSchema), (req, res, next) =>
  membersController.delete(req, res, next)
);
router.post(
  '/:id/self-update-link',
  authorize(Permissions.VIEW_MEMBERS),
  validate(selfUpdateLinkSchema),
  (req, res, next) => membersController.selfUpdateLink(req, res, next)
);
router.post(
  '/invite-link',
  authorize(Permissions.VIEW_MEMBERS),
  validate(inviteLinkSchema),
  (req, res, next) => membersController.inviteLink(req, res, next)
);

export default router;
