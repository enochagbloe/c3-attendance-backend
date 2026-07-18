import { z } from 'zod';

const csvToArray = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
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

export const operationsTeamQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).optional(),
    departmentId: z.string().uuid().optional(),
    volunteerRoleId: z.string().uuid().optional(),
    leadershipRoleId: z.string().uuid().optional(),
    status: z.preprocess(
      csvToArray,
      z.array(z.enum(['active', 'inactive', 'volunteer', 'leader', 'admin'])).optional()
    ),
    availability: z.enum(['available', 'assigned']).optional(),
    hasUpcomingAssignments: z.preprocess(booleanFromQuery, z.boolean().optional()),
  }),
});

export const operationsTeamSummarySchema = z.object({
  query: z.object({
    departmentId: z.string().uuid().optional(),
  }),
});

export type OperationsTeamQuery = z.infer<typeof operationsTeamQuerySchema>['query'];
