import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { volunteerAssignmentsService } from './volunteer-assignments.service';

class VolunteerAssignmentsController {
  private getEventId(req: Request) {
    return Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
  }

  private getAssignmentId(req: Request) {
    return Array.isArray(req.params.assignmentId) ? req.params.assignmentId[0] : req.params.assignmentId;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await volunteerAssignmentsService.create(this.getEventId(req), req.body, req.user?.id);
      return sendSuccess({ res, data, statusCode: 201, message: 'Volunteer assignment created' });
    } catch (err) {
      return next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await volunteerAssignmentsService.list(this.getEventId(req), req.query);
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await volunteerAssignmentsService.getById(
        this.getEventId(req),
        this.getAssignmentId(req)
      );
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await volunteerAssignmentsService.update(
        this.getEventId(req),
        this.getAssignmentId(req),
        req.body
      );
      return sendSuccess({ res, data, message: 'Volunteer assignment updated' });
    } catch (err) {
      return next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await volunteerAssignmentsService.remove(
        this.getEventId(req),
        this.getAssignmentId(req)
      );
      return sendSuccess({
        res,
        data,
        message: data.action === 'deleted' ? 'Volunteer assignment deleted' : 'Volunteer assignment cancelled',
      });
    } catch (err) {
      return next(err);
    }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await volunteerAssignmentsService.getSummary(this.getEventId(req));
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const volunteerAssignmentsController = new VolunteerAssignmentsController();
