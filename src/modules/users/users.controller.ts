import { NextFunction, Request, Response } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/apiResponse';

class UsersController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.createUser(req.body);
      return sendSuccess({ res, data: user, statusCode: 201, message: 'User created' });
    } catch (err) {
      return next(err);
    }
  }
}

export const usersController = new UsersController();
