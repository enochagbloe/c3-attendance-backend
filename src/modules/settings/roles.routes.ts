import { Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess, sendError } from '../../utils/apiResponse';

const router = Router();

const nameSchema = z.string().min(1);
const createRoleSchema = z.object({
  body: z.object({
    name: nameSchema,
    description: z.string().optional(),
  }),
});
const updateRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: nameSchema.optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
const createDepartmentSchema = z.object({
  body: z.object({
    name: nameSchema,
    description: z.string().optional(),
    leaderId: z.string().uuid().optional().nullable(),
  }),
});
const updateDepartmentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: nameSchema.optional(),
    description: z.string().optional().nullable(),
    leaderId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});
const createFellowshipSchema = z.object({
  body: z.object({
    name: nameSchema,
  }),
});
const updateFellowshipSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: nameSchema.optional(),
    isActive: z.boolean().optional(),
  }),
});

function handlePrismaError(err, next, res) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return sendError({ res, message: 'Name already exists', statusCode: 409, code: 'NAME_EXISTS' });
  }
  return next(err);
}

function ensureAdmin(req, res) {
  if (req.user?.role === Role.SUPER_ADMIN || req.user?.role === Role.CHURCH_ADMIN) return true;
  sendError({ res, message: 'Forbidden', statusCode: 403, code: 'FORBIDDEN' });
  return false;
}

router.use(authenticate);

// Volunteer Roles
router.post('/volunteer-roles', (req, res, next) => {
  const parsed = createRoleSchema.safeParse({ body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  const { name, description } = parsed.data.body;
  prisma.volunteerRole
    .create({ data: { name, description } })
    .then((data) => sendSuccess({ res, data, statusCode: 201 }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.get('/volunteer-roles', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.volunteerRole
    .findMany({ orderBy: { name: 'asc' } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.get('/volunteer-roles/:id', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.volunteerRole
    .findUnique({ where: { id: req.params.id } })
    .then((data) => (data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 })))
    .catch((err) => next(err));
});

router.patch('/volunteer-roles/:id', (req, res, next) => {
  const parsed = updateRoleSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  prisma.volunteerRole
    .update({ where: { id: req.params.id }, data: parsed.data.body })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.patch('/volunteer-roles/:id/deactivate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.volunteerRole
    .update({ where: { id: req.params.id }, data: { isActive: false } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.patch('/volunteer-roles/:id/activate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.volunteerRole
    .update({ where: { id: req.params.id }, data: { isActive: true } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

// Leadership Roles
router.post('/leadership-roles', (req, res, next) => {
  const parsed = createRoleSchema.safeParse({ body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  const { name, description } = parsed.data.body;
  prisma.leadershipRole
    .create({ data: { name, description } })
    .then((data) => sendSuccess({ res, data, statusCode: 201 }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.get('/leadership-roles', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.leadershipRole
    .findMany({ orderBy: { name: 'asc' } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.get('/leadership-roles/:id', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.leadershipRole
    .findUnique({ where: { id: req.params.id } })
    .then((data) => (data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 })))
    .catch((err) => next(err));
});

router.patch('/leadership-roles/:id', (req, res, next) => {
  const parsed = updateRoleSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  prisma.leadershipRole
    .update({ where: { id: req.params.id }, data: parsed.data.body })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.patch('/leadership-roles/:id/deactivate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.leadershipRole
    .update({ where: { id: req.params.id }, data: { isActive: false } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.patch('/leadership-roles/:id/activate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.leadershipRole
    .update({ where: { id: req.params.id }, data: { isActive: true } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

// Departments
router.post('/departments', (req, res, next) => {
  const parsed = createDepartmentSchema.safeParse({ body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  prisma.department
    .create({ data: parsed.data.body })
    .then((data) => sendSuccess({ res, data, statusCode: 201 }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.get('/departments', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.department
    .findMany({ orderBy: { name: 'asc' } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.get('/departments/:id', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.department
    .findUnique({ where: { id: req.params.id } })
    .then((data) => (data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 })))
    .catch((err) => next(err));
});

router.patch('/departments/:id', (req, res, next) => {
  const parsed = updateDepartmentSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  prisma.department
    .update({ where: { id: req.params.id }, data: parsed.data.body })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.patch('/departments/:id/deactivate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.department
    .update({ where: { id: req.params.id }, data: { isActive: false } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.patch('/departments/:id/activate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.department
    .update({ where: { id: req.params.id }, data: { isActive: true } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

// Fellowships
router.post('/fellowships', (req, res, next) => {
  const parsed = createFellowshipSchema.safeParse({ body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  prisma.fellowship
    .create({ data: parsed.data.body })
    .then((data) => sendSuccess({ res, data, statusCode: 201 }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.get('/fellowships', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.fellowship
    .findMany({ orderBy: { name: 'asc' } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.get('/fellowships/:id', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.fellowship
    .findUnique({ where: { id: req.params.id } })
    .then((data) => (data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 })))
    .catch((err) => next(err));
});

router.patch('/fellowships/:id', (req, res, next) => {
  const parsed = updateFellowshipSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) return sendError({ res, message: parsed.error.message, statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!ensureAdmin(req, res)) return;
  prisma.fellowship
    .update({ where: { id: req.params.id }, data: parsed.data.body })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => handlePrismaError(err, next, res));
});

router.patch('/fellowships/:id/deactivate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.fellowship
    .update({ where: { id: req.params.id }, data: { isActive: false } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

router.patch('/fellowships/:id/activate', (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  prisma.fellowship
    .update({ where: { id: req.params.id }, data: { isActive: true } })
    .then((data) => sendSuccess({ res, data }))
    .catch((err) => next(err));
});

export default router;
