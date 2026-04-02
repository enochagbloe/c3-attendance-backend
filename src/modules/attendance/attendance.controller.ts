import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service';
import { sendSuccess } from '../../utils/apiResponse';

class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await attendanceService.checkIn(req.body);
      return sendSuccess({ res, data: record, statusCode: 201, message: 'Check-in successful' });
    } catch (err) {
      return next(err);
    }
  }

  async today(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await attendanceService.getToday();
      return sendSuccess({ res, data: records });
    } catch (err) {
      return next(err);
    }
  }

  async byRange(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      const start = new Date(startDate);
      const end = new Date(endDate);
      const records = await attendanceService.getByDateRange(start, end);
      return sendSuccess({ res, data: records });
    } catch (err) {
      return next(err);
    }
  }

  async closeService(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceId } = req.body;
      const result = await attendanceService.closeService(serviceId);
      return sendSuccess({ res, data: result, message: 'Service closed, members marked out of church' });
    } catch (err) {
      return next(err);
    }
  }
}

export const attendanceController = new AttendanceController();
