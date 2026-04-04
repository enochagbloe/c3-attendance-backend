import { NextFunction, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { eventsService } from './events.service';
import { listEventsQuerySchema } from './events.validation';

class EventsController {
  private getId(req: Request) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventsService.create(req.body);
      return sendSuccess({ res, data, statusCode: 201, message: 'Event created' });
    } catch (err) {
      return next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listEventsQuerySchema.safeParse({ query: req.query });
      if (!parsed.success) {
        return sendError({
          res,
          message: parsed.error.issues.map((issue) => issue.message).join('; '),
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      const data = await eventsService.list(parsed.data.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventsService.getById(this.getId(req));
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventsService.update(this.getId(req), req.body);
      return sendSuccess({ res, data, message: 'Event updated' });
    } catch (err) {
      return next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await eventsService.delete(this.getId(req));
      return sendSuccess({ res, data: null, message: 'Event deleted' });
    } catch (err) {
      return next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventsService.cancel(this.getId(req));
      return sendSuccess({ res, data, message: 'Event cancelled' });
    } catch (err) {
      return next(err);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventsService.archive(this.getId(req));
      return sendSuccess({ res, data, message: 'Event archived' });
    } catch (err) {
      return next(err);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventsService.restore(this.getId(req));
      return sendSuccess({ res, data, message: 'Event restored' });
    } catch (err) {
      return next(err);
    }
  }
}

export const eventsController = new EventsController();
