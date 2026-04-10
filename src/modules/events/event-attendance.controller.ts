import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { eventAttendanceService } from './event-attendance.service';

class EventAttendanceController {
  private getEventId(req: Request) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.register(this.getEventId(req), req.body);
      return sendSuccess({ res, data, statusCode: 201 });
    } catch (err) {
      return next(err);
    }
  }

  async listRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.listRegistrations(this.getEventId(req), req.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.checkIn(this.getEventId(req), req.body, req.user?.id);
      return sendSuccess({ res, data, statusCode: 201 });
    } catch (err) {
      return next(err);
    }
  }

  async listAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.listAttendance(this.getEventId(req), req.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.getAttendanceSummary(this.getEventId(req));
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async timeline(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await eventAttendanceService.getAttendanceTimeline(this.getEventId(req), req.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const eventAttendanceController = new EventAttendanceController();
