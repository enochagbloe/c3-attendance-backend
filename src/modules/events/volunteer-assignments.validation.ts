import { EventVolunteerAssignmentStatus } from '@prisma/client';
import { z } from 'zod';

const eventIdParam = z.object({
  eventId: z.string().uuid('Invalid event id'),
});

const assignmentIdParam = z.object({
  assignmentId: z.string().uuid('Invalid assignment id'),
});

const nullableUuid = z.string().uuid().optional().nullable();

const assignmentShape = {
  memberId: z.string().uuid('memberId is required'),
  volunteerRoleId: nullableUuid,
  departmentId: nullableUuid,
  assignmentTitle: z.string().trim().min(1).max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
};

const ensureDescriptor = (value: {
  volunteerRoleId?: string | null;
  departmentId?: string | null;
  assignmentTitle?: string | null;
}) => Boolean(value.volunteerRoleId || value.departmentId || value.assignmentTitle);

export const createVolunteerAssignmentSchema = z.object({
  params: eventIdParam,
  body: z
    .object(assignmentShape)
    .refine(ensureDescriptor, 'At least one of volunteerRoleId, departmentId, or assignmentTitle is required'),
});

export const updateVolunteerAssignmentSchema = z.object({
  params: eventIdParam.merge(assignmentIdParam),
  body: z
    .object({
      volunteerRoleId: nullableUuid,
      departmentId: nullableUuid,
      assignmentTitle: z.string().trim().min(1).max(120).optional().nullable(),
      notes: z.string().trim().max(1000).optional().nullable(),
      status: z.nativeEnum(EventVolunteerAssignmentStatus).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')
    .refine(
      (value) => {
        if (
          !('volunteerRoleId' in value) &&
          !('departmentId' in value) &&
          !('assignmentTitle' in value)
        ) {
          return true;
        }

        return ensureDescriptor(value);
      },
      'At least one of volunteerRoleId, departmentId, or assignmentTitle is required'
    ),
});

export const volunteerAssignmentIdSchema = z.object({
  params: eventIdParam.merge(assignmentIdParam),
});

const csvToArray = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const listVolunteerAssignmentsSchema = z.object({
  params: eventIdParam,
  query: z.object({
    status: z.preprocess(
      csvToArray,
      z.array(z.nativeEnum(EventVolunteerAssignmentStatus)).optional()
    ),
    volunteerRoleId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    search: z.string().trim().min(1).optional(),
  }),
});

export const volunteerAssignmentSummarySchema = z.object({
  params: eventIdParam,
});

export type VolunteerAssignmentListQuery = z.infer<typeof listVolunteerAssignmentsSchema>['query'];
