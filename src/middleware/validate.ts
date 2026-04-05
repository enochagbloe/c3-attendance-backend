import { ZodError, ZodObject, ZodRawShape } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/apiResponse';

export const validate = (schema: ZodObject<ZodRawShape>) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Express 5 request properties can be read-only; avoid reassigning query/params.
    req.body = parsed.body;
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues.map((issue) => issue.message).join('; ');
      return sendError({ res, message, statusCode: 400, code: 'VALIDATION_ERROR' });
    }
    return next(err);
  }
};
