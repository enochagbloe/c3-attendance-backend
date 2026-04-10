import {
  AttendeeType,
  CheckInMethod,
  CheckInSource,
  EventRegistrationStatus,
  RegistrationSource,
} from '@prisma/client';
import { z } from 'zod';

const eventIdParam = z.object({
  id: z.string().uuid('Invalid event id'),
});

export const registerForEventSchema = z.object({
  params: eventIdParam,
  body: z.object({
    fullName: z.string().trim().min(1, 'fullName is required'),
    phoneNumber: z.string().trim().min(1, 'phoneNumber is required'),
    email: z.string().email().optional(),
    registrationSource: z.nativeEnum(RegistrationSource).optional(),
  }),
});

export const registrationListQuerySchema = z.object({
  params: eventIdParam,
  query: z.object({
    attendeeType: z.nativeEnum(AttendeeType).optional(),
    status: z.nativeEnum(EventRegistrationStatus).optional(),
    search: z.string().trim().min(1).optional(),
  }),
});

export const checkInSchema = z.object({
  params: eventIdParam,
  body: z.object({
    fullName: z.string().trim().min(1, 'fullName is required'),
    phoneNumber: z.string().trim().min(1, 'phoneNumber is required'),
    accompanyingCount: z.number().int().min(0).optional(),
    checkInMethod: z.nativeEnum(CheckInMethod),
    checkInSource: z.nativeEnum(CheckInSource).optional(),
  }),
});

export const attendanceListQuerySchema = z.object({
  params: eventIdParam,
  query: z.object({
    attendeeType: z.nativeEnum(AttendeeType).optional(),
    method: z.nativeEnum(CheckInMethod).optional(),
    search: z.string().trim().min(1).optional(),
    checkedInFrom: z.coerce.date().optional(),
    checkedInTo: z.coerce.date().optional(),
  }),
});

export const attendanceSummaryQuerySchema = z.object({
  params: eventIdParam,
});

export const attendanceTimelineQuerySchema = z.object({
  params: eventIdParam,
  query: z.object({
    bucketMinutes: z.coerce.number().int().min(1).max(60).optional(),
  }),
});

export type RegistrationListQuery = z.infer<typeof registrationListQuerySchema>['query'];
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>['query'];
export type AttendanceTimelineQuery = z.infer<typeof attendanceTimelineQuerySchema>['query'];
