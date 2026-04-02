import { Request, Response, NextFunction } from 'express';
import { membersService } from './members.service';
import { sendSuccess } from '../../utils/apiResponse';

class MembersController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await membersService.create(req.body);
      return sendSuccess({ res, data: member, statusCode: 201, message: 'Member created' });
    } catch (err) {
      return next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const includeDeleted = Boolean(req.query.includeDeleted) && req.query.includeDeleted === 'true';
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const { items, meta } = await membersService.list(includeDeleted, page, limit);
      return sendSuccess({ res, data: { items, meta } });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await membersService.getById(req.params.id);
      return sendSuccess({ res, data: member });
    } catch (err) {
      return next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await membersService.update(req.params.id, req.body);
      return sendSuccess({ res, data: member, message: 'Member updated' });
    } catch (err) {
      return next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await membersService.softDelete(req.params.id);
      return sendSuccess({ res, data: member, message: 'Member deleted' });
    } catch (err) {
      return next(err);
    }
  }

  async selfUpdateLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { expiresInMinutes } = req.body as { expiresInMinutes?: number };
      const data = await membersService.createSelfUpdateLink(req.params.id, expiresInMinutes || 60);
      return sendSuccess({ res, data, message: 'Self-update link generated' });
    } catch (err) {
      return next(err);
    }
  }

  async inviteLink(_req: Request, res: Response, next: NextFunction) {
    try {
      const { expiresInMinutes } = _req.body as { expiresInMinutes?: number };
      const data = await membersService.createInviteLink(expiresInMinutes || 1440);
      return sendSuccess({ res, data, message: 'Invite link generated' });
    } catch (err) {
      return next(err);
    }
  }

  async selfRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.selfRegister(req.body);
      return sendSuccess({ res, data, statusCode: 201, message: 'Member registered' });
    } catch (err) {
      return next(err);
    }
  }
}

export const membersController = new MembersController();
