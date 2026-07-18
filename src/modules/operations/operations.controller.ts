import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { operationsService } from './operations.service';

class OperationsController {
  async listTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await operationsService.listTeam(req.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await operationsService.getTeamSummary(req.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const operationsController = new OperationsController();
