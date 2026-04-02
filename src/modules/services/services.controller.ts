import { NextFunction, Request, Response } from 'express';
import { servicesService } from './services.service';
import { sendSuccess } from '../../utils/apiResponse';

class ServicesController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await servicesService.create(req.body);
      return sendSuccess({ res, data, statusCode: 201, message: 'Service created' });
    } catch (err) {
      return next(err);
    }
  }

  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await servicesService.list();
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await servicesService.getById(req.params.id);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const servicesController = new ServicesController();
