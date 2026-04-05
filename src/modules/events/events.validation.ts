import { CheckInMode, EventStatus } from '@prisma/client';
import { z } from 'zod';

const idParam = z.object({
  id: z.string().uuid('Invalid event id'),
});

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format');

const eventBodyBase = z.object({
  title: z.string().trim().min(1, 'title is required'),
  type: z.string().trim().min(1, 'type is required'),
  date: z.coerce.date(),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  venue: z.string().trim().min(1, 'venue is required'),
  status: z.nativeEnum(EventStatus).optional(),
  attendanceEnabled: z.boolean().optional(),
  checkInMode: z.nativeEnum(CheckInMode).optional(),
  description: z.string().trim().min(1).optional().nullable(),
  organizerDepartmentId: z.string().uuid().optional().nullable(),
  organizerName: z.string().trim().min(1).optional().nullable(),
  audience: z.string().trim().min(1).optional().nullable(),
  qrCheckInEnabled: z.boolean().optional(),
  colorTag: z.string().trim().min(1).optional().nullable(),
});

export const createEventSchema = z.object({
  body: eventBodyBase,
});

export const updateEventSchema = z.object({
  params: idParam,
  body: eventBodyBase
    .partial()
    .extend({
      status: z.enum([
        EventStatus.DRAFT,
        EventStatus.SCHEDULED,
        EventStatus.ACTIVE,
        EventStatus.COMPLETED,
      ]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const idParamSchema = z.object({
  params: idParam,
});

const csvToArray = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === 'string'
        ? item
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : []
    );
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return value;
};

const booleanFromQuery = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return value;
};

export const listEventsQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).optional(),
    type: z.preprocess(csvToArray, z.array(z.string().trim().min(1)).optional()),
    status: z.preprocess(csvToArray, z.array(z.nativeEnum(EventStatus)).optional()),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    attendanceEnabled: z.preprocess(booleanFromQuery, z.boolean().optional()),
    qrCheckInEnabled: z.preprocess(booleanFromQuery, z.boolean().optional()),
  }),
});

export type EventListQuery = z.infer<typeof listEventsQuerySchema>['query'];
