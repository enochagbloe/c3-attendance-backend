import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { eventAttendanceService } from '../events/event-attendance.service';

class PublicEventsController {
  private getToken(req: Request) {
    return Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  }

  async getRegistrationMetadata(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.getPublicRegistrationMetadata(this.getToken(req));
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.publicRegister(this.getToken(req), req.body);
      return sendSuccess({ res, data, statusCode: 201 });
    } catch (err) {
      return next(err);
    }
  }

  async getCheckInMetadata(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.getPublicCheckInMetadata(this.getToken(req));
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async selfCheckIn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.publicSelfCheckIn(this.getToken(req), req.body);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const publicEventsController = new PublicEventsController();
