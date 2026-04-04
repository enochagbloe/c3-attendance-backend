import { NextFunction, Request, Response, Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { sendError, sendSuccess } from '../../utils/apiResponse';

const router = Router();

const nameSchema = z.string().trim().min(1, 'name is required');

const createRoleSchema = z.object({
  body: z.object({
    name: nameSchema,
    description: z.string().trim().min(1).optional(),
  }),
});

const updateRoleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: nameSchema.optional(),
    description: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

const createDepartmentSchema = z.object({
  body: z.object({
    name: nameSchema,
    description: z.string().trim().min(1).optional(),
    leaderId: z.string().uuid().optional().nullable(),
  }),
});

const updateDepartmentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: nameSchema.optional(),
    description: z.string().trim().min(1).optional().nullable(),
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

function validationMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join('; ');
}

function getId(req: Request) {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

function ensureAdmin(req: Request, res: Response) {
  if (req.user?.role === Role.SUPER_ADMIN || req.user?.role === Role.CHURCH_ADMIN) {
    return true;
  }

  sendError({ res, message: 'Forbidden', statusCode: 403, code: 'FORBIDDEN' });
  return false;
}

function handlePrismaError(err: unknown, next: NextFunction, res: Response) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return sendError({ res, message: 'Name already exists', statusCode: 409, code: 'NAME_EXISTS' });
  }

  return next(err);
}

router.use(authenticate);

router.post('/volunteer-roles', async (req, res, next) => {
  const parsed = createRoleSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.volunteerRole.create({ data: parsed.data.body });
    return sendSuccess({ res, data, statusCode: 201 });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.get('/volunteer-roles', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.volunteerRole.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/volunteer-roles/:id', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.volunteerRole.findUnique({ where: { id: getId(req) } });
    return data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 });
  } catch (err) {
    return next(err);
  }
});

router.patch('/volunteer-roles/:id', async (req, res, next) => {
  const parsed = updateRoleSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.volunteerRole.update({ where: { id: getId(req) }, data: parsed.data.body });
    return sendSuccess({ res, data });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.patch('/volunteer-roles/:id/deactivate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.volunteerRole.update({ where: { id: getId(req) }, data: { isActive: false } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.patch('/volunteer-roles/:id/activate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.volunteerRole.update({ where: { id: getId(req) }, data: { isActive: true } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.post('/leadership-roles', async (req, res, next) => {
  const parsed = createRoleSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.leadershipRole.create({ data: parsed.data.body });
    return sendSuccess({ res, data, statusCode: 201 });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.get('/leadership-roles', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.leadershipRole.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/leadership-roles/:id', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.leadershipRole.findUnique({ where: { id: getId(req) } });
    return data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 });
  } catch (err) {
    return next(err);
  }
});

router.patch('/leadership-roles/:id', async (req, res, next) => {
  const parsed = updateRoleSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.leadershipRole.update({ where: { id: getId(req) }, data: parsed.data.body });
    return sendSuccess({ res, data });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.patch('/leadership-roles/:id/deactivate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.leadershipRole.update({ where: { id: getId(req) }, data: { isActive: false } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.patch('/leadership-roles/:id/activate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.leadershipRole.update({ where: { id: getId(req) }, data: { isActive: true } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.post('/departments', async (req, res, next) => {
  const parsed = createDepartmentSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.department.create({ data: parsed.data.body });
    return sendSuccess({ res, data, statusCode: 201 });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.get('/departments', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/departments/:id', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.department.findUnique({ where: { id: getId(req) } });
    return data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 });
  } catch (err) {
    return next(err);
  }
});

router.patch('/departments/:id', async (req, res, next) => {
  const parsed = updateDepartmentSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.department.update({ where: { id: getId(req) }, data: parsed.data.body });
    return sendSuccess({ res, data });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.patch('/departments/:id/deactivate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.department.update({ where: { id: getId(req) }, data: { isActive: false } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.patch('/departments/:id/activate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.department.update({ where: { id: getId(req) }, data: { isActive: true } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.post('/fellowships', async (req, res, next) => {
  const parsed = createFellowshipSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.fellowship.create({ data: parsed.data.body });
    return sendSuccess({ res, data, statusCode: 201 });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.get('/fellowships', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.fellowship.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/fellowships/:id', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.fellowship.findUnique({ where: { id: getId(req) } });
    return data ? sendSuccess({ res, data }) : sendError({ res, message: 'Not found', statusCode: 404 });
  } catch (err) {
    return next(err);
  }
});

router.patch('/fellowships/:id', async (req, res, next) => {
  const parsed = updateFellowshipSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) {
    return sendError({ res, message: validationMessage(parsed.error), statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!ensureAdmin(req, res)) return;

  try {
    const data = await prisma.fellowship.update({ where: { id: getId(req) }, data: parsed.data.body });
    return sendSuccess({ res, data });
  } catch (err) {
    return handlePrismaError(err, next, res);
  }
});

router.patch('/fellowships/:id/deactivate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.fellowship.update({ where: { id: getId(req) }, data: { isActive: false } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.patch('/fellowships/:id/activate', async (req, res, next) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const data = await prisma.fellowship.update({ where: { id: getId(req) }, data: { isActive: true } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

export default router;
