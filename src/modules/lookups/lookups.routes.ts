import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.use(authenticate);

router.get('/fellowships', async (_req, res, next) => {
  try {
    const data = await prisma.fellowship.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/leadership-roles', async (_req, res, next) => {
  try {
    const data = await prisma.leadershipRole.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/volunteer-roles', async (_req, res, next) => {
  try {
    const data = await prisma.volunteerRole.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

router.get('/departments', async (_req, res, next) => {
  try {
    const data = await prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return sendSuccess({ res, data });
  } catch (err) {
    return next(err);
  }
});

export default router;
