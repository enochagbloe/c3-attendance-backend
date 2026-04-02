import { Response } from 'express';

interface SuccessOptions<T> {
  res: Response;
  data: T;
  message?: string;
  statusCode?: number;
}

export function sendSuccess<T>({ res, data, message, statusCode = 200 }: SuccessOptions<T>) {
  return res.status(statusCode).json({ success: true, data, message });
}

interface ErrorOptions {
  res: Response;
  message: string;
  code?: string;
  statusCode?: number;
}

export function sendError({ res, message, code, statusCode = 400 }: ErrorOptions) {
  return res.status(statusCode).json({ success: false, error: { message, code } });
}
