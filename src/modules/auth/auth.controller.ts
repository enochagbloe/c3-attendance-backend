import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.login(req.body);
      return sendSuccess({ res, data, message: 'Login successful' });
    } catch (err) {
      return next(err);
    }
  }

  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.signup({
        ...req.body,
        signupKey: req.body.signupKey || (req.headers['x-signup-key'] as string | undefined),
      });
      return sendSuccess({ res, data, statusCode: 201, message: 'Signup successful' });
    } catch (err) {
      return next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.requestPasswordReset(req.body.email);
      return sendSuccess({ res, data, message: 'If that email exists, a reset link will be sent.' });
    } catch (err) {
      return next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.resetPassword(req.body.token, req.body.newPassword);
      return sendSuccess({ res, data, message: 'Password reset successful' });
    } catch (err) {
      return next(err);
    }
  }
}

export const authController = new AuthController();
