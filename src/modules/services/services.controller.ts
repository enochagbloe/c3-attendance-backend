import { NextFunction, Request, Response } from 'express';
import { servicesService } from './services.service';
import { sendSuccess } from '../../utils/apiResponse';

class ServicesController {
  private getId(req: Request) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  }

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
      const data = await servicesService.getById(this.getId(req));
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const servicesController = new ServicesController();
